import {
  addMonths,
  DataRetentionCron,
  formatDeletionDate,
  noticeStageFor,
} from './data-retention.cron';
import { purgeOrganizationData } from './purge-organization-data';

const NOW = new Date('2026-10-06T07:00:00');
const daysFromNow = (days: number) =>
  new Date(NOW.getTime() + days * 24 * 60 * 60 * 1000);

function makeCron(
  overrides: {
    organizations?: object[];
    admins?: object[];
    staff?: object[];
    emailOk?: boolean;
  } = {},
) {
  const tx = { organization: { delete: jest.fn() } };
  const prisma = {
    organization: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findMany: jest.fn().mockResolvedValue(overrides.organizations ?? []),
      update: jest.fn().mockResolvedValue({}),
    },
    user: {
      findMany: jest.fn(({ where }: { where: { roles: { has: string } } }) =>
        Promise.resolve(
          where.roles.has === 'ADMIN'
            ? (overrides.admins ?? [])
            : (overrides.staff ?? []),
        ),
      ),
    },
    $transaction: jest.fn((fn: (t: unknown) => unknown) => fn(tx)),
  };
  const email = {
    sendDataDeletionNotice: jest
      .fn()
      .mockResolvedValue(overrides.emailOk ?? true),
  };
  const config = {
    get: jest
      .fn()
      .mockReturnValue('https://app.example.com/,http://localhost:3000'),
  };
  const cron = new DataRetentionCron(prisma as any, email as any, config as any);
  return { cron, prisma, email };
}

jest.mock('./purge-organization-data', () => ({
  purgeOrganizationData: jest.fn(),
}));

describe('DataRetentionCron helpers', () => {
  it('picks the notice stage from the days left', () => {
    expect(noticeStageFor(180)).toBe(1);
    expect(noticeStageFor(30)).toBe(2);
    expect(noticeStageFor(8)).toBe(2);
    expect(noticeStageFor(7)).toBe(3);
  });

  it('adds 6 months and formats the date in Spanish', () => {
    expect(addMonths(NOW, 6).getMonth()).toBe(3); // abril
    expect(formatDeletionDate(new Date('2027-04-06T07:00:00'))).toBe(
      'martes 6 de abril de 2027',
    );
  });
});

describe('DataRetentionCron — schedule and cancel', () => {
  it('schedules inactive organizations 6 months out', async () => {
    const { cron, prisma } = makeCron();
    await cron.scheduleInactiveOrganizations(NOW);
    expect(prisma.organization.updateMany).toHaveBeenCalledWith({
      where: { active: false, dataDeletionScheduledAt: null },
      data: {
        dataDeletionScheduledAt: addMonths(NOW, 6),
        dataDeletionNoticesSent: 0,
      },
    });
  });

  it('cancels the deletion of reactivated organizations', async () => {
    const { cron, prisma } = makeCron();
    await cron.cancelForReactivatedOrganizations();
    expect(prisma.organization.updateMany).toHaveBeenCalledWith({
      where: { active: true, dataDeletionScheduledAt: { not: null } },
      data: { dataDeletionScheduledAt: null, dataDeletionNoticesSent: 0 },
    });
  });
});

describe('DataRetentionCron — sendDueNotices', () => {
  const organization = (
    days: number,
    sent: number,
    billingContact: object | null = null,
  ) => ({
    id: 'org-1',
    name: 'Panadería Norte',
    dataDeletionScheduledAt: daysFromNow(days),
    dataDeletionNoticesSent: sent,
    subscription: { billingContact },
  });

  it('sends the first notice to admins and the billing contact, and records it', async () => {
    const { cron, prisma, email } = makeCron({
      organizations: [organization(180, 0, { email: 'pagos@norte.co', active: true })],
      admins: [{ email: 'admin@norte.co' }],
    });

    await expect(cron.sendDueNotices(NOW)).resolves.toBe(1);
    expect(email.sendDataDeletionNotice).toHaveBeenCalledWith(
      ['admin@norte.co', 'pagos@norte.co'],
      expect.objectContaining({
        organizationName: 'Panadería Norte',
        reminder: false,
        accessLink: 'https://app.example.com/access',
      }),
    );
    expect(prisma.organization.update).toHaveBeenCalledWith({
      where: { id: 'org-1' },
      data: { dataDeletionNoticesSent: 1 },
    });
  });

  it('sends the one-week reminder once', async () => {
    const { cron, email } = makeCron({
      organizations: [organization(5, 2)],
      admins: [{ email: 'admin@norte.co' }],
    });
    await cron.sendDueNotices(NOW);
    expect(email.sendDataDeletionNotice).toHaveBeenCalledWith(
      ['admin@norte.co'],
      expect.objectContaining({ reminder: true }),
    );

    const again = makeCron({
      organizations: [organization(5, 3)],
      admins: [{ email: 'admin@norte.co' }],
    });
    await again.cron.sendDueNotices(NOW);
    expect(again.email.sendDataDeletionNotice).not.toHaveBeenCalled();
  });

  it('also notifies the billing contact', async () => {
    const { cron, email } = makeCron({
      organizations: [{ ...organization(180, 0), subscription: { billingContact: { email: 'pagos@norte.co', active: true } } }],
      admins: [{ email: 'admin@norte.co' }],
    });
    await cron.sendDueNotices(NOW);
    expect(email.sendDataDeletionNotice).toHaveBeenCalledWith(
      ['admin@norte.co', 'pagos@norte.co'],
      expect.anything(),
    );
  });

  it('does not record a notice Resend rejected', async () => {
    const { cron, prisma } = makeCron({
      organizations: [organization(180, 0)],
      admins: [{ email: 'a@b.co' }],
      emailOk: false,
    });
    await expect(cron.sendDueNotices(NOW)).resolves.toBe(0);
    expect(prisma.organization.update).not.toHaveBeenCalled();
  });
});

describe('DataRetentionCron — purgeDueOrganizations', () => {
  it('deletes everything of the due organizations', async () => {
    const { cron } = makeCron({ organizations: [{ id: 'org-1' }] });
    await expect(cron.purgeDueOrganizations(NOW)).resolves.toBe(1);
    expect(purgeOrganizationData).toHaveBeenCalledWith(expect.anything(), 'org-1');
  });

  it('keeps going when one organization fails', async () => {
    const { cron } = makeCron({ organizations: [{ id: 'org-1' }, { id: 'org-2' }] });
    (purgeOrganizationData as jest.Mock)
      .mockRejectedValueOnce(new Error('fk'))
      .mockResolvedValueOnce({});
    await expect(cron.purgeDueOrganizations(NOW)).resolves.toBe(1);
  });
});
