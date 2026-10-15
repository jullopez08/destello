import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CurrentUserData } from '../common/decorators/current-user.decorator';
import { hasRole } from '../common/auth/roles.util';

export const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Reused by findAll/findOne so the Organizations screen can show who the billing
// contact is without a separate query, and by setBillingContact so its
// response has the same shape as everywhere else.
export const BILLING_CONTACT_SELECT = { id: true, name: true, email: true } as const;

// Reused by findAll/findOne so the Super Admin's Subscriptions screen can
// show the full payment history (cash + Wompi mixed) without a separate
// query, newest first.
export const PAYMENTS_INCLUDE = { payments: { orderBy: { createdAt: 'desc' as const } } };

// Quién puede ver y pagar la suscripción: el contacto de facturación si hay
// uno; si no, cualquier dueña (ADMIN) de la empresa. Lo comparten findMine y
// PaymentsService.createCheckout para que ver y pagar nunca difieran. Quien
// llama ya comprobó que la suscripción es de currentUser.organizationId.
export function canManageBilling(
  subscription: { billingContactUserId: string | null },
  currentUser: CurrentUserData,
): boolean {
  return subscription.billingContactUserId
    ? subscription.billingContactUserId === currentUser.userId
    : hasRole(currentUser, Role.ADMIN);
}

// COP cents a organization owes per period: its plan's price minus its manual
// discount. Shared by findMine (what the screen shows) and
// PaymentsService.createCheckout (what Wompi charges) so they can't differ.
export function amountDue(price: number, discountPercent: number): number {
  return Math.round((price * (100 - discountPercent)) / 100);
}

@Injectable()
export class SubscriptionsService {

  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.subscription.findMany({
      include: { organization: true, plan: true, billingContact: { select: BILLING_CONTACT_SELECT }, ...PAYMENTS_INCLUDE },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Subscription <-> Organization is one-to-one, so callers look this up by
  // organizationId rather than the Subscription's own id — that's the identifier
  // every other caller (OrganizationsService, UsersService's seat check) already
  // has on hand.
  async findOne(organizationId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { organizationId },
      include: { organization: true, plan: true, billingContact: { select: BILLING_CONTACT_SELECT }, ...PAYMENTS_INCLUDE },
    });

    if (!subscription) {
      throw new NotFoundException('No se encontró una suscripción para esta empresa.');
    }

    return subscription;
  }

  // El contacto de facturación debe ser una dueña (ADMIN) de esa misma empresa.
  async setBillingContact(organizationId: string, userId: string) {
    await this.findOne(organizationId);

    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new BadRequestException('El usuario especificado no existe.');
    }

    if (user.organizationId !== organizationId) {
      throw new BadRequestException('El usuario debe pertenecer a la misma empresa de la suscripción.');
    }

    if (!hasRole(user, Role.ADMIN)) {
      throw new BadRequestException('El contacto de facturación debe ser una dueña de la empresa.');
    }

    return this.prisma.subscription.update({
      where: { organizationId },
      data: { billingContactUserId: userId },
      include: { organization: true, plan: true, billingContact: { select: BILLING_CONTACT_SELECT } },
    });
  }

  // Self-service view for the doctor/receptionist dashboard: resolves the
  // caller's own organization straight from the JWT (`organizationId` is already on
  // CurrentUserData — StaffProfileService.resolveCallerStaffProfile is the
  // wrong tool here, since it's backed by the StaffProfile table and would
  // 404 for a MEMBER, who has no StaffProfile at all).
  //
  // Access rule: if billingContactUserId is set, only that exact user may
  // view this organization's billing info — not "any doctor", not other staff.
  // If it's unset, any DOCTOR at the organization can see it by default, but a
  // MEMBER needs an explicit assignment first.
  async findMine(currentUser: CurrentUserData) {
    const { organizationId } = currentUser;

    // In practice only SUPER_ADMIN reaches here with a null organizationId (the
    // RolesGuard's blanket SUPER_ADMIN bypass lets them past @Roles(DOCTOR,
    // MEMBER) on the controller) — reject explicitly rather than let
    // `where: { organizationId: null }` silently match nothing.
    if (!organizationId) {
      throw new ForbiddenException("You do not have access to this organization's billing information.");
    }

    const subscription = await this.prisma.subscription.findUnique({
      where: { organizationId },
      include: {
        plan: true,
        organization: true,
        payments: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!subscription) {
      throw new NotFoundException('No se encontró una suscripción para esta empresa.');
    }

    const hasAccess = canManageBilling(subscription, currentUser);

    // Not an authorization failure — "this user isn't the billing contact"
    // is an expected, everyday state (most doctors/receptionists, on every
    // dashboard load), not a permission violation. A thrown 403 here used to
    // make that the common case on this route, which is exactly backwards:
    // it showed up as a red network/console entry on nearly every non-owner
    // login. 200 + hasAccess:false lets the frontend branch on the body
    // instead of an HTTP error status (see getMySubscription).
    // A organization the Super Admin created on a paid plan starts out ACTIVE with
    // a full period ahead (OrganizationsService.create), but it hasn't actually
    // paid anything yet — the frontend holds it on the Subscription screen
    // until the first payment is approved (Wompi or cash). Trial plans are
    // exempt: a trial is usable as-is until it expires. Exposed to every
    // organization user (not just the billing contact) as a bare boolean, so
    // everyone else can be told to contact whoever pays.
    const awaitingFirstPayment =
      !subscription.plan.isTrial &&
      subscription.plan.price > 0 &&
      !subscription.payments.some((p) => p.status === 'APPROVED');

    if (!hasAccess) {
      return { hasAccess: false as const, awaitingFirstPayment };
    }

    return {
      hasAccess: true as const,
      plan: {
        name: subscription.plan.name,
        price: subscription.plan.price,
        durationDays: subscription.plan.durationDays,
        isTrial: subscription.plan.isTrial,
      },
      // What the Wompi button will actually charge — the same number
      // PaymentsService.createCheckout signs.
      amountDue: amountDue(
        subscription.plan.price,
        subscription.discountPercent,
      ),
      awaitingFirstPayment,
      status: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd,
      payments: subscription.payments,
      // Lets the frontend decide whether to restrict navigation to the
      // Subscription tab only — the source of truth for "is this organization
      // locked", independent of `status` (a PAST_DUE organization still in its
      // grace period is still active).
      organizationActive: subscription.organization.active,
    };
  }
}
