// Datos y dobles de prueba compartidos por las pruebas de PaymentsService.
// (Termina en -spec.ts: queda fuera del build y Jest no lo corre como prueba.)
export const DAY = 24 * 60 * 60 * 1000;

export function makePrisma(
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

export function makeWompi(transaction?: any) {
  return {
    isConfigured: jest.fn().mockReturnValue(true),
    verifyEventSignature: jest.fn().mockReturnValue(true),
    generateIntegritySignature: jest.fn().mockReturnValue('sig'),
    getTransaction: jest.fn().mockResolvedValue(transaction),
  };
}

export const PENDING_PAYMENT = {
  id: 'pay-1',
  subscriptionId: 'sub-1',
  amount: 9000000,
  wompiTransactionId: null,
};

export const webhook = (transaction: any) => ({
  event: 'transaction.updated',
  data: { transaction },
  timestamp: 1,
  signature: { checksum: 'chk-1', properties: [] },
});

export const PLAN_1 = {
  id: 'plan1',
  name: 'Plan 1 — Mensual',
  price: 9000000,
  durationDays: 30,
  isTrial: false,
};
