import { Role } from '@prisma/client';
import { SubscriptionsService } from './subscriptions.service';

const owner = {
  userId: 'u-1',
  email: 'duena@example.com',
  roles: [Role.ADMIN],
  organizationId: 'organization-1',
  exp: 0,
};

function makeService(subscription: Record<string, unknown>) {
  const prisma = {
    subscription: {
      findUnique: jest.fn().mockResolvedValue({
        billingContactUserId: null,
        discountPercent: 0,
        status: 'ACTIVE',
        currentPeriodEnd: new Date(),
        organization: { active: true },
        payments: [],
        ...subscription,
      }),
    },
  };
  return new SubscriptionsService(prisma as any);
}

const PAID_PLAN = {
  name: 'Plan 1 — Mensual',
  price: 9000000,
  durationDays: 30,
  isTrial: false,
};

describe('SubscriptionsService — findMine awaitingFirstPayment', () => {
  it('is true on a paid plan with no approved payment yet', async () => {
    const service = makeService({
      plan: PAID_PLAN,
      payments: [{ status: 'PENDING' }, { status: 'DECLINED' }],
    });

    await expect(service.findMine(owner)).resolves.toMatchObject({
      hasAccess: true,
      awaitingFirstPayment: true,
      amountDue: 9000000,
    });
  });

  it('is false once any payment (Wompi or cash) was approved', async () => {
    const service = makeService({
      plan: PAID_PLAN,
      payments: [{ status: 'APPROVED' }],
    });

    await expect(service.findMine(owner)).resolves.toMatchObject({
      awaitingFirstPayment: false,
    });
  });

  it('is false on a trial plan — a trial is usable until it expires', async () => {
    const service = makeService({
      plan: { name: 'Free Trial', price: 0, durationDays: 15, isTrial: true },
    });

    await expect(service.findMine(owner)).resolves.toMatchObject({
      awaitingFirstPayment: false,
    });
  });

  it('tells non-billing users only the boolean, nothing else', async () => {
    const service = makeService({
      plan: PAID_PLAN,
      billingContactUserId: 'someone-else',
    });

    await expect(service.findMine(owner)).resolves.toEqual({
      hasAccess: false,
      awaitingFirstPayment: true,
    });
  });
});
