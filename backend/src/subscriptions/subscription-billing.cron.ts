import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentDueNotice } from './payment-due-notice';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Plan que se asigna al vencer la prueba gratuita (lo crea
// scripts/upsert-purchasable-plans.ts y se busca por su nombre, que es único).
export const TRIAL_FOLLOW_UP_PLAN_NAME = 'Plan Mensual';

@Injectable()
export class SubscriptionBillingCron {

  private readonly logger = new Logger(SubscriptionBillingCron.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentDueNotice: PaymentDueNotice,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async handleDueSubscriptions() {
    this.logger.log('Running subscription billing cron');

    // Runs first so a discount that expired the same day billing runs is
    // already reset to 0 by the time billSubscription calculates the amount.
    await this.resetExpiredDiscounts();

    // Enforces the 1-day grace period: organizations whose grace window has
    // elapsed get blocked here.
    await this.blockOrganizationsWithExpiredGracePeriod();

    const dueSubscriptions = await this.prisma.subscription.findMany({
      where: {
        status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] },
        currentPeriodEnd: { lt: new Date() },
      },
      include: { plan: true },
    });

    this.logger.log(`Found ${dueSubscriptions.length} subscription(s) due for billing`);

    for (const subscription of dueSubscriptions) {
      await this.billSubscription(subscription);
    }
  }

  // Separate, testable step: reverts any organization-specific discount whose
  // discountExpiresAt has already passed back to "no discount". Subscriptions
  // with an indefinite discount (discountExpiresAt: null) never match here.
  async resetExpiredDiscounts() {
    const result = await this.prisma.subscription.updateMany({
      where: {
        discountPercent: { gt: 0 },
        discountExpiresAt: { lt: new Date() },
      },
      data: { discountPercent: 0, discountExpiresAt: null },
    });

    if (result.count > 0) {
      this.logger.log(`Reset ${result.count} expired discount(s) to 0.`);
    }

    return result.count;
  }

  // Separate, testable step: this is the ONLY place Organization.active flips to
  // false once a subscription's grace period runs out — billSubscription
  // only sets status: PAST_DUE + gracePeriodEndsAt (now + 1 day), leaving the
  // organization usable during the grace window. Subscriptions blocked manually via
  // SubscriptionControlsService.updateStatus never set gracePeriodEndsAt, so they
  // never match here (already blocked immediately, on purpose).
  async blockOrganizationsWithExpiredGracePeriod() {
    const expired = await this.prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.PAST_DUE,
        gracePeriodEndsAt: { lt: new Date() },
        organization: { active: true },
      },
      select: { organizationId: true },
    });

    if (expired.length === 0) {
      return 0;
    }

    const result = await this.prisma.organization.updateMany({
      where: { id: { in: expired.map((subscription) => subscription.organizationId) } },
      data: { active: false },
    });

    this.logger.log(`Blocked ${result.count} organization(s) whose grace period expired.`);

    return result.count;
  }

  // No charge is attempted here — the organization pays through Wompi itself (or
  // the Super Admin records cash) — this only starts the grace-period clock;
  // Organization.active stays true until blockOrganizationsWithExpiredGracePeriod picks
  // it up the following day. An approved Wompi payment at any point undoes
  // both (PaymentsService.activateSubscription).
  private async markPastDueWithGracePeriod(subscriptionId: string) {
    await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: SubscriptionStatus.PAST_DUE,
        gracePeriodEndsAt: new Date(Date.now() + MS_PER_DAY),
      },
    });
  }

  // Separate, testable step: applies the organization's discountPercent (0 by
  // default) to the plan's price. Amounts are whole numbers (COP cents),
  // hence the rounding. discountPercent 0 always yields exactly planPrice.
  calculateBillingAmount(planPrice: number, discountPercent: number): number {
    return Math.round(planPrice * (1 - discountPercent / 100));
  }

  // Wompi has no stored card to charge (each payment is a checkout the organization
  // starts from its Subscription view), so there's nothing to attempt here. A
  // subscription reaching its period end without an approved payment — Wompi
  // or cash (SubscriptionControlsService.recordCashPayment) — has currentPeriodEnd in
  // the past, since both extend it; it's marked PAST_DUE with a 1-day grace
  // period, after which the organization is blocked and sees the payment wall.
  private async billSubscription(subscription: any) {
    this.logger.warn(`Subscription ${subscription.id} is due for billing and has no payment on file, marking as past due.`);
    if (subscription.plan.isTrial) {
      await this.assignPaidPlanAfterTrial(subscription);
    }
    await this.markPastDueWithGracePeriod(subscription.id);
    // Aviso del día de gracia: "tu acceso está a punto de vencer, actualiza tu pago".
    await this.paymentDueNotice.send(subscription.organizationId, subscription.plan.isTrial);
  }

  // Paso aparte (y probado): un plan de prueba no tiene nada que pagar, así
  // que una empresa que se queda en él al vencer quedaría bloqueada sin botón
  // de Wompi. Se le asigna el plan mensual sin tocar currentPeriodEnd (a
  // diferencia de SubscriptionControlsService.changePlan), así el cron la sigue
  // viendo vencida y el primer pago con Wompi inicia su primer período pagado.
  // Si el plan no existe, se queda en prueba y el super admin le asigna uno.
  async assignPaidPlanAfterTrial(subscription: { id: string; organizationId: string }) {
    const plan = await this.prisma.plan.findFirst({
      where: { name: TRIAL_FOLLOW_UP_PLAN_NAME, active: true, isTrial: false },
    });

    if (!plan) {
      this.logger.warn(
        `Trial subscription ${subscription.id} expired and "${TRIAL_FOLLOW_UP_PLAN_NAME}" doesn't exist — keeping the trial plan, the Super Admin must assign one.`,
      );
      return null;
    }

    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: { planId: plan.id },
    });

    this.logger.log(`Trial subscription ${subscription.id} expired, assigned "${plan.name}".`);

    return plan;
  }
}
