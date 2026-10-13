import { Role } from '@prisma/client';
import { PaymentsService } from './payments.service';

const DAY = 24 * 60 * 60 * 1000;

function makePrisma(
  overrides: {
    payment?: any;
    subscription?: any;
    plan?: any;
    updateManyCount?: number;
  } = {},
) {
  const tx = {
    payment: {
      updateMany: jest
        .fn()
        .mockResolvedValue({ count: overrides.updateManyCount ?? 1 }),
      update: jest.fn().mockResolvedValue({}),
    },
    subscription: {
      findUnique: jest.fn().mockResolvedValue(overrides.subscription ?? null),
      update: jest.fn().mockResolvedValue({}),
    },
    plan: { findUnique: jest.fn().mockResolvedValue(overrides.plan ?? null) },
    organization: { update: jest.fn().mockResolvedValue({}) },
    wompiWebhookEvent: { create: jest.fn().mockResolvedValue({}) },
  };

  const prisma = {
    payment: {
      findUnique: jest.fn().mockResolvedValue(null),
      findFirst: jest.fn().mockResolvedValue(overrides.payment ?? null),
      create: jest.fn().mockResolvedValue({}),
    },
    subscription: {
      findUnique: jest.fn().mockResolvedValue(overrides.subscription ?? null),
    },
    wompiWebhookEvent: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({}),
    },
    $transaction: jest.fn((fn: (client: typeof tx) => Promise<unknown>) =>
      fn(tx),
    ),
  };

  return { prisma, tx };
}

function makeWompi(transaction?: any) {
  return {
    isConfigured: jest.fn().mockReturnValue(true),
    verifyEventSignature: jest.fn().mockReturnValue(true),
    generateIntegritySignature: jest.fn().mockReturnValue('sig'),
    getTransaction: jest.fn().mockResolvedValue(transaction),
  };
}

const PENDING_PAYMENT = {
  id: 'pay-1',
  subscriptionId: 'sub-1',
  amount: 9000000,
  wompiTransactionId: null,
};

const webhook = (transaction: any) => ({
  event: 'transaction.updated',
  data: { transaction },
  timestamp: 1,
  signature: { checksum: 'chk-1', properties: [] },
});

const PLAN_1 = {
  id: 'plan1',
  name: 'Plan 1 — Mensual',
  price: 9000000,
  durationDays: 30,
  isTrial: false,
};

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

describe('PaymentsService — handleWompiWebhook', () => {
  const approved = {
    id: 'tx-1',
    status: 'APPROVED',
    reference: 'sub_sub1_1000_plan2',
    amount_in_cents: 9000000,
    currency: 'COP',
  };

  it('switches to the paid plan, extends and unlocks the organization on APPROVED', async () => {
    const currentPeriodEnd = new Date(Date.now() + 5 * DAY);
    const { prisma, tx } = makePrisma({
      payment: PENDING_PAYMENT,
      subscription: {
        id: 'sub-1',
        organizationId: 'organization-1',
        currentPeriodEnd,
        plan: { id: 'plan1', durationDays: 30 },
      },
      plan: { id: 'plan2', durationDays: 180 },
    });
    const service = new PaymentsService(prisma as any, makeWompi() as any);

    await expect(
      service.handleWompiWebhook(webhook(approved) as any),
    ).resolves.toEqual({ received: true });

    expect(tx.payment.updateMany).toHaveBeenCalledWith({
      where: { id: 'pay-1', status: { not: 'APPROVED' } },
      data: { status: 'APPROVED', wompiTransactionId: 'tx-1' },
    });
    expect(tx.plan.findUnique).toHaveBeenCalledWith({ where: { id: 'plan2' } });
    // Paying early keeps the remaining days: new period starts at the old end,
    // and runs for the PAID plan's duration, not the old plan's.
    expect(tx.subscription.update).toHaveBeenCalledWith({
      where: { id: 'sub-1' },
      data: {
        planId: 'plan2',
        status: 'ACTIVE',
        currentPeriodEnd: new Date(currentPeriodEnd.getTime() + 180 * DAY),
        gracePeriodEndsAt: null,
      },
    });
    expect(tx.organization.update).toHaveBeenCalledWith({
      where: { id: 'organization-1' },
      data: { active: true },
      select: { slug: true },
    });
    expect(tx.wompiWebhookEvent.create).toHaveBeenCalledWith({
      data: { checksum: 'chk-1' },
    });
  });

  it('does not extend twice when the payment was already approved', async () => {
    const { prisma, tx } = makePrisma({
      payment: PENDING_PAYMENT,
      updateManyCount: 0,
    });
    const service = new PaymentsService(prisma as any, makeWompi() as any);

    await service.handleWompiWebhook(webhook(approved) as any);

    expect(tx.subscription.update).not.toHaveBeenCalled();
  });

  it('does not activate when the paid amount differs from the checkout amount', async () => {
    const { prisma, tx } = makePrisma({ payment: PENDING_PAYMENT });
    const service = new PaymentsService(prisma as any, makeWompi() as any);

    await service.handleWompiWebhook(
      webhook({ ...approved, amount_in_cents: 100 }) as any,
    );

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(tx.subscription.update).not.toHaveBeenCalled();
  });

  it('records DECLINED on the payment without touching the subscription', async () => {
    const { prisma, tx } = makePrisma({ payment: PENDING_PAYMENT });
    const service = new PaymentsService(prisma as any, makeWompi() as any);

    await service.handleWompiWebhook(
      webhook({ ...approved, status: 'DECLINED' }) as any,
    );

    expect(tx.payment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: 'DECLINED', wompiTransactionId: 'tx-1' },
      }),
    );
    expect(tx.subscription.update).not.toHaveBeenCalled();
  });

  it('answers 200 and does nothing on an invalid signature', async () => {
    const { prisma } = makePrisma({ payment: PENDING_PAYMENT });
    const wompi = makeWompi();
    wompi.verifyEventSignature.mockReturnValue(false);
    const service = new PaymentsService(prisma as any, wompi as any);

    await expect(
      service.handleWompiWebhook(webhook(approved) as any),
    ).resolves.toEqual({ received: true });
    expect(prisma.payment.findFirst).not.toHaveBeenCalled();
  });

  it('answers 200 even when processing throws', async () => {
    const { prisma } = makePrisma({ payment: PENDING_PAYMENT });
    prisma.$transaction.mockRejectedValue(new Error('db down'));
    const service = new PaymentsService(prisma as any, makeWompi() as any);

    await expect(
      service.handleWompiWebhook(webhook(approved) as any),
    ).resolves.toEqual({ received: true });
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
