import { PaymentsService } from './payments.service';
import { DAY, makePrisma, makeWompi, PENDING_PAYMENT, webhook } from './payments.fixtures-spec';

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
