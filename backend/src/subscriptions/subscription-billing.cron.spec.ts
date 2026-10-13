import { SubscriptionBillingCron, TRIAL_FOLLOW_UP_PLAN_NAME } from './subscription-billing.cron';

const MONTHLY = { id: 'plan-1', name: TRIAL_FOLLOW_UP_PLAN_NAME };

function makeCron(plan: object | null) {
  const prisma = {
    plan: { findFirst: jest.fn().mockResolvedValue(plan) },
    subscription: { update: jest.fn().mockResolvedValue({}) },
  };
  return { cron: new SubscriptionBillingCron(prisma as any), prisma };
}

const subscription = { id: 'sub-1', organizationId: 'organization-1' };

describe('SubscriptionBillingCron — assignPaidPlanAfterTrial', () => {
  it('al vencer la prueba asigna el plan mensual', async () => {
    const { cron, prisma } = makeCron(MONTHLY);

    await expect(cron.assignPaidPlanAfterTrial(subscription)).resolves.toBe(MONTHLY);
    expect(prisma.plan.findFirst).toHaveBeenCalledWith({
      where: { name: TRIAL_FOLLOW_UP_PLAN_NAME, active: true, isTrial: false },
    });
    expect(prisma.subscription.update).toHaveBeenCalledWith({
      where: { id: 'sub-1' },
      data: { planId: 'plan-1' },
    });
  });

  it('se queda en prueba si el plan mensual no existe', async () => {
    const { cron, prisma } = makeCron(null);

    await expect(cron.assignPaidPlanAfterTrial(subscription)).resolves.toBeNull();
    expect(prisma.subscription.update).not.toHaveBeenCalled();
  });
});
