import { PaymentDueNotice } from './payment-due-notice';

function makeNotice(organization: object | null) {
  const prisma = { organization: { findUnique: jest.fn().mockResolvedValue(organization) } };
  const email = { sendPaymentDueNotice: jest.fn().mockResolvedValue(true) };
  const config = { get: jest.fn().mockReturnValue('https://destello.test/,http://localhost:3100') };
  return { notice: new PaymentDueNotice(prisma as any, email as any, config as any), email };
}

describe('PaymentDueNotice', () => {
  it('avisa a la dueña y al contacto de facturación, sin repetir correos', async () => {
    const { notice, email } = makeNotice({
      name: 'Cocina Destello',
      users: [{ email: 'duena@destello.test' }],
      subscription: { billingContact: { email: 'duena@destello.test', active: true } },
    });

    await expect(notice.send('organization-1', false)).resolves.toBe(true);
    expect(email.sendPaymentDueNotice).toHaveBeenCalledWith(['duena@destello.test'], {
      organizationName: 'Cocina Destello',
      trialEnded: false,
      accessLink: 'https://destello.test/access#suscripcion',
    });
  });

  it('no manda nada si la empresa no tiene a quién avisar', async () => {
    const { notice, email } = makeNotice({ name: 'X', users: [], subscription: { billingContact: { email: 'a@b.co', active: false } } });

    await expect(notice.send('organization-1', true)).resolves.toBe(false);
    expect(email.sendPaymentDueNotice).not.toHaveBeenCalled();
  });

  it('un error al avisar no rompe el cobro', async () => {
    const { notice, email } = makeNotice({ name: 'X', users: [{ email: 'a@b.co' }], subscription: null });
    email.sendPaymentDueNotice.mockRejectedValue(new Error('caído'));

    await expect(notice.send('organization-1', false)).resolves.toBe(false);
  });
});
