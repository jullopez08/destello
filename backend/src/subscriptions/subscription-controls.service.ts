import { BadRequestException, Injectable } from '@nestjs/common';
import { SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BILLING_CONTACT_SELECT, MS_PER_DAY, PAYMENTS_INCLUDE, SubscriptionsService } from './subscriptions.service';

// Controles manuales del super admin sobre una suscripción: cambiar plan,
// estado, extender, descuento y pagos en efectivo (casos especiales; lo normal
// es que Wompi active y extienda solo).
@Injectable()
export class SubscriptionControlsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptions: SubscriptionsService,
  ) {}

  // Plan change, not a renewal: currentPeriodEnd is recomputed from today
  // using the new plan's durationDays, discarding whatever time was left on
  // the old period.
  async changePlan(organizationId: string, newPlanId: string) {
    await this.subscriptions.findOne(organizationId);

    const newPlan = await this.prisma.plan.findUnique({ where: { id: newPlanId } });

    if (!newPlan) {
      throw new BadRequestException('El plan especificado no existe.');
    }

    return this.prisma.subscription.update({
      where: { organizationId },
      data: {
        planId: newPlan.id,
        currentPeriodEnd: new Date(Date.now() + newPlan.durationDays * MS_PER_DAY),
      },
      include: { organization: true, plan: true },
    });
  }

  // Manual override (e.g. reactivating after an off-system payment, or
  // suspending). Organization.active is kept in lockstep: ACTIVE -> true,
  // CANCELLED/PAST_DUE -> false. TRIALING is left as-is on purpose — it's
  // set at organization creation, not something this manual override implies.
  async updateStatus(organizationId: string, status: SubscriptionStatus) {
    await this.subscriptions.findOne(organizationId);

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.subscription.update({ where: { organizationId }, data: { status } });

      if (status === SubscriptionStatus.ACTIVE) {
        await tx.organization.update({ where: { id: organizationId }, data: { active: true } });
      } else if (status === SubscriptionStatus.CANCELLED || status === SubscriptionStatus.PAST_DUE) {
        await tx.organization.update({ where: { id: organizationId }, data: { active: false } });
      }

      return tx.subscription.findUnique({
        where: { organizationId },
        include: { organization: true, plan: true },
      });
    });

    return result;
  }

  // Grace-period style adjustment — extends (or shortens) the existing
  // currentPeriodEnd without touching the plan.
  async extendPeriod(organizationId: string, days: number) {
    const subscription = await this.subscriptions.findOne(organizationId);

    return this.prisma.subscription.update({
      where: { organizationId },
      data: {
        currentPeriodEnd: new Date(subscription.currentPeriodEnd.getTime() + days * MS_PER_DAY),
      },
      include: { organization: true, plan: true },
    });
  }

  // Full replace, not a partial patch: omitting discountExpiresAt (or sending
  // it as null) always clears it to indefinite, it never just "leaves the
  // previous value alone". discountPercent range is enforced by the DTO.
  async setDiscount(organizationId: string, discountPercent: number, discountExpiresAt?: string | null) {
    await this.subscriptions.findOne(organizationId);

    let expiresAt: Date | null = null;

    if (discountExpiresAt) {
      expiresAt = new Date(discountExpiresAt);

      if (expiresAt.getTime() <= Date.now()) {
        throw new BadRequestException('discountExpiresAt debe ser una fecha futura.');
      }
    }

    return this.prisma.subscription.update({
      where: { organizationId },
      data: { discountPercent, discountExpiresAt: expiresAt },
      include: { organization: true, plan: true },
    });
  }

  // Off-system payment collected in person (e.g. cash at the front desk).
  // Payments are manual only — no webhook to wait for — the Payment is
  // recorded as APPROVED and the Subscription advances immediately.
  // `amount` is COP cents (RecordCashPaymentDto documents this) — same unit
  // as Plan.price and every other Payment.amount in the system. The caller
  // (SubscriptionsView's CashPaymentSection) is responsible for converting
  // the pesos the admin types into cents before this is called.
  async recordCashPayment(organizationId: string, amount: number, note?: string) {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('El monto debe ser un número positivo.');
    }

    const subscription = await this.subscriptions.findOne(organizationId);

    const periodStart = new Date();
    const periodEnd = new Date(periodStart.getTime() + subscription.plan.durationDays * MS_PER_DAY);
    const newPeriodEnd = new Date(subscription.currentPeriodEnd.getTime() + subscription.plan.durationDays * MS_PER_DAY);

    return this.prisma.$transaction(async (tx) => {
      await tx.payment.create({
        data: {
          subscriptionId: subscription.id,
          method: 'CASH',
          amount,
          status: 'APPROVED',
          note,
          periodStart,
          periodEnd,
        },
      });

      await tx.subscription.update({
        where: { organizationId },
        data: { status: SubscriptionStatus.ACTIVE, currentPeriodEnd: newPeriodEnd },
      });

      await tx.organization.update({ where: { id: organizationId }, data: { active: true } });

      return tx.subscription.findUnique({
        where: { organizationId },
        include: { organization: true, plan: true, billingContact: { select: BILLING_CONTACT_SELECT }, ...PAYMENTS_INCLUDE },
      });
    });
  }
}
