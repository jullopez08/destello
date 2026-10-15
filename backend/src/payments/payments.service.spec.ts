import { Role } from '@prisma/client';
import { PaymentsService } from './payments.service';
import { makePrisma, makeWompi, PLAN_1 } from './payments.fixtures-spec';

describe('PaymentsService — createCheckout', () => {
  const doctor = {
    userId: 'u-1',
    email: 'doc@example.com',
    roles: [Role.ADMIN],
    organizationId: 'organization-1',
    exp: 0,
  };
  const subscription = {
    id: 'sub1',
    organizationId: 'organization-1',
    planId: 'plan1',
    plan: PLAN_1,
    billingContactUserId: null,
    discountPercent: 10,
  };

  it('charges the assigned plan minus discount, never an amount from the client', async () => {
    const { prisma } = makePrisma({ subscription });
    const wompi = makeWompi();
    const service = new PaymentsService(prisma as any, wompi as any);

    const result = await service.createCheckout(doctor);

    expect(result.amountInCents).toBe(8100000);
    expect(result.customerEmail).toBe('doc@example.com');
    expect(result.reference).toMatch(/^sub_sub1_\d+_plan1$/);
    expect(wompi.generateIntegritySignature).toHaveBeenCalledWith(
      result.reference,
      8100000,
    );
    expect(prisma.payment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          amount: 8100000,
          status: 'PENDING',
          method: 'WOMPI',
        }),
      }),
    );
  });

  it('refuses to charge a trial plan', async () => {
    const { prisma } = makePrisma({
      subscription: {
        ...subscription,
        plan: { ...PLAN_1, isTrial: true, price: 0 },
      },
    });
    const service = new PaymentsService(prisma as any, makeWompi() as any);

    await expect(service.createCheckout(doctor)).rejects.toThrow(
      'no requiere pago',
    );
    expect(prisma.payment.create).not.toHaveBeenCalled();
  });

  it('rejects a user who is not the billing contact', async () => {
    const { prisma } = makePrisma({
      subscription: { ...subscription, billingContactUserId: 'someone-else' },
    });
    const service = new PaymentsService(prisma as any, makeWompi() as any);

    await expect(service.createCheckout(doctor)).rejects.toThrow(
      'No tienes permiso',
    );
    expect(prisma.payment.create).not.toHaveBeenCalled();
  });
});

describe('PaymentsService — getTransactionStatus', () => {
  it('rejects ids that are not Wompi-shaped before calling out', async () => {
    const { prisma } = makePrisma();
    const wompi = makeWompi();
    const service = new PaymentsService(prisma as any, wompi as any);

    await expect(
      service.getTransactionStatus('../merchants/x'),
    ).rejects.toThrow('inválido');
    expect(wompi.getTransaction).not.toHaveBeenCalled();
  });

  it('returns the status reported by Wompi', async () => {
    const { prisma } = makePrisma();
    const wompi = makeWompi({
      id: 'tx-9',
      status: 'DECLINED',
      reference: 'unknown',
      amount_in_cents: 1,
      currency: 'COP',
    });
    const service = new PaymentsService(prisma as any, wompi as any);

    await expect(service.getTransactionStatus('tx-9')).resolves.toEqual({
      id: 'tx-9',
      status: 'DECLINED',
      reference: 'unknown',
      amountInCents: 1,
    });
  });
});
