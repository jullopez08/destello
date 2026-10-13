import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CurrentUserData } from '../common/decorators/current-user.decorator';
import {
  amountDue,
  canManageBilling,
} from '../subscriptions/subscriptions.service';
import {
  WOMPI_CURRENCY,
  WompiService,
  type WompiTransaction,
  type WompiWebhookPayload,
} from '../wompi/wompi.service';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// References are minted by createCheckout as
// `sub_{subscriptionId}_{periodStartMs}_{planId}`: periodStartMs is the
// PENDING Payment's periodStart at checkout time (how the first event finds
// it), planId is the organization's assigned plan at checkout time (Payment has no
// column for it, and the reference travels on every Wompi event and
// transaction lookup anyway) — so a Super Admin changing the plan while a
// payment is in flight can't make the approval extend the wrong plan.
// Both ids are cuids, which never contain "_".
const REFERENCE_PATTERN = /^sub_([^_]+)_(\d+)_([^_]+)$/;

// Wompi transaction ids look like "15113-1718921355-38406" — anything else is
// rejected before it's interpolated into an outbound URL.
const TRANSACTION_ID_PATTERN = /^[A-Za-z0-9-]{1,64}$/;

const FAILED_STATUSES = new Set(['DECLINED', 'VOIDED', 'ERROR']);

type PaymentRef = {
  id: string;
  subscriptionId: string;
  amount: number;
  wompiTransactionId: string | null;
};

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly wompiService: WompiService,
  ) {}

  // Everything the widget needs to open a checkout for the plan the Super
  // Admin assigned to the caller's organization — organizations don't pick plans
  // themselves. The amount is always derived here (plan price minus the
  // organization's discount, same as SubscriptionsService.findMine's amountDue) —
  // never taken from the client — and the integrity signature binds Wompi
  // to exactly that amount + reference, so the browser can't pay less than
  // it owes. A PENDING Payment row is recorded up front so the webhook has
  // something to match the reference against.
  async createCheckout(currentUser: CurrentUserData) {
    this.assertConfigured();

    const subscription = await this.findBillableSubscription(currentUser);
    const amountInCents = amountDue(
      subscription.plan.price,
      subscription.discountPercent,
    );

    if (subscription.plan.isTrial || amountInCents <= 0) {
      throw new BadRequestException('Tu plan actual no requiere pago.');
    }

    const periodStart = new Date();
    const reference = `sub_${subscription.id}_${periodStart.getTime()}_${subscription.plan.id}`;

    await this.prisma.payment.create({
      data: {
        subscriptionId: subscription.id,
        method: 'WOMPI',
        amount: amountInCents,
        status: 'PENDING',
        note: subscription.plan.name,
        periodStart,
        periodEnd: new Date(
          periodStart.getTime() + subscription.plan.durationDays * MS_PER_DAY,
        ),
      },
    });

    return {
      reference,
      amountInCents,
      currency: WOMPI_CURRENCY,
      signature: this.wompiService.generateIntegritySignature(
        reference,
        amountInCents,
      ),
      customerEmail: currentUser.email,
    };
  }

  // Always resolves (the controller always answers 200): Wompi retries
  // anything else on its own schedule, and none of the failure modes below
  // would be fixed by a retry — a bad signature stays bad, an unknown
  // reference stays unknown. A transient DB failure is the one case a retry
  // would help; that's covered by getTransactionStatus, which re-applies
  // the same result when the user lands on /pago/confirmacion.
  async handleWompiWebhook(payload: WompiWebhookPayload) {
    try {
      if (!this.wompiService.isConfigured()) {
        this.logger.warn(
          'Wompi webhook received but Wompi is not configured, ignoring.',
        );
        return { received: true };
      }

      if (!this.wompiService.verifyEventSignature(payload)) {
        this.logger.warn('Wompi webhook with an invalid signature, ignoring.');
        return { received: true };
      }

      if (payload.event !== 'transaction.updated') {
        this.logger.log(
          `Wompi event "${payload.event}" is not handled, ignoring.`,
        );
        return { received: true };
      }

      // Idempotence: the checksum is a hash over the event's properties +
      // timestamp + secret, so it's unique per distinct event content and
      // safely dedupes Wompi's automatic redelivery retries.
      const checksum = payload.signature.checksum;
      const alreadyProcessed = await this.prisma.wompiWebhookEvent.findUnique({
        where: { checksum },
      });
      if (alreadyProcessed) {
        this.logger.log(`Wompi event ${checksum} already processed, skipping.`);
        return { received: true };
      }

      const transaction = payload.data?.transaction as
        WompiTransaction | undefined;
      if (!transaction) {
        this.logger.warn(
          'Wompi transaction.updated event with no data.transaction, ignoring.',
        );
        return { received: true };
      }

      await this.applyTransaction(transaction, checksum);
    } catch (err) {
      this.logger.error(
        'Failed to process Wompi webhook',
        err instanceof Error ? err.stack : String(err),
      );
    }

    return { received: true };
  }

  // Backs /pago/confirmacion: asks Wompi for the transaction's real status
  // (never trusting the redirect's query params) and applies it the same
  // way the webhook would. Applying it here too means a webhook that was
  // lost or failed doesn't leave a paid organization locked out — both paths are
  // idempotent, so whichever arrives second is a no-op.
  async getTransactionStatus(transactionId: string) {
    if (!TRANSACTION_ID_PATTERN.test(transactionId)) {
      throw new BadRequestException('Identificador de transacción inválido.');
    }

    this.assertConfigured();

    let transaction: WompiTransaction;
    try {
      transaction = await this.wompiService.getTransaction(transactionId);
    } catch (err) {
      if (
        (err as { response?: { status?: number } })?.response?.status === 404
      ) {
        throw new NotFoundException('No encontramos esa transacción.');
      }
      this.logger.error(
        `Failed to fetch Wompi transaction ${transactionId}`,
        err instanceof Error ? err.stack : String(err),
      );
      throw new BadGatewayException(
        'No pudimos consultar el estado del pago. Inténtalo de nuevo en unos minutos.',
      );
    }

    try {
      await this.applyTransaction(transaction);
    } catch (err) {
      // The status shown to the user comes straight from Wompi either way —
      // a failure to record it locally shouldn't hide it from them.
      this.logger.error(
        `Failed to apply Wompi transaction ${transactionId}`,
        err instanceof Error ? err.stack : String(err),
      );
    }

    return {
      id: String(transaction.id),
      status: String(transaction.status),
      reference: transaction.reference,
      amountInCents: transaction.amount_in_cents,
    };
  }

  private async findBillableSubscription(currentUser: CurrentUserData) {
    if (!currentUser.organizationId) {
      throw new ForbiddenException(
        'Solo los usuarios de una empresa pueden pagar su suscripción.',
      );
    }

    const subscription = await this.prisma.subscription.findUnique({
      where: { organizationId: currentUser.organizationId },
      include: { plan: true },
    });

    if (!subscription) {
      throw new NotFoundException(
        'No se encontró una suscripción para esta empresa.',
      );
    }

    if (!canManageBilling(subscription, currentUser)) {
      throw new ForbiddenException(
        'No tienes permiso para gestionar los pagos de esta empresa.',
      );
    }

    return subscription;
  }

  private assertConfigured() {
    if (!this.wompiService.isConfigured()) {
      throw new ServiceUnavailableException(
        'Los pagos en línea aún no están disponibles.',
      );
    }
  }

  private async applyTransaction(
    transaction: WompiTransaction,
    checksum?: string,
  ) {
    const transactionId = String(transaction.id);
    const status = String(transaction.status);
    const payment = await this.findPayment(
      transactionId,
      transaction.reference,
    );

    if (!payment) {
      this.logger.warn(
        `No local Payment for Wompi transaction ${transactionId} (reference ${transaction.reference}), ignoring.`,
      );
      await this.recordEvent(this.prisma, checksum);
      return;
    }

    if (
      payment.wompiTransactionId &&
      payment.wompiTransactionId !== transactionId
    ) {
      this.logger.error(
        `Payment ${payment.id} is already linked to Wompi transaction ${payment.wompiTransactionId}, not ${transactionId} — ignoring.`,
      );
      await this.recordEvent(this.prisma, checksum);
      return;
    }

    // The integrity signature already binds the widget to this amount, but
    // it's re-checked here so an activation can never depend on that alone.
    if (
      transaction.amount_in_cents !== payment.amount ||
      transaction.currency !== WOMPI_CURRENCY
    ) {
      this.logger.error(
        `Wompi transaction ${transactionId} is ${transaction.amount_in_cents} ${transaction.currency}, but Payment ${payment.id} expects ${payment.amount} ${WOMPI_CURRENCY} — not applying. Needs manual review.`,
      );
      await this.recordEvent(this.prisma, checksum);
      return;
    }

    // Se asigna dentro del callback de $transaction: el `as` evita que TS lo
    // estreche a `null` aquí y lo trate como `never` después de la transacción.

    await this.prisma.$transaction(async (tx) => {
      // Conditional on "not already APPROVED" so the webhook and
      // getTransactionStatus can both apply the same result without
      // extending the subscription twice — only whichever call actually
      // flips the row gets count === 1.
      const { count } = await tx.payment.updateMany({
        where: { id: payment.id, status: { not: 'APPROVED' } },
        data: { status, wompiTransactionId: transactionId },
      });

      if (count === 0) {
        if (status !== 'APPROVED') {
          this.logger.warn(
            `Payment ${payment.id} was already APPROVED and Wompi now reports ${status} for ${transactionId} — left as is. Needs manual review.`,
          );
        }
      } else if (status === 'APPROVED') {
        const planId = REFERENCE_PATTERN.exec(transaction.reference ?? '')?.[3];
        await this.activateSubscription(
          tx,
          payment.id,
          payment.subscriptionId,
          planId,
        );
        this.logger.log(
          `Payment ${payment.id} approved (Wompi ${transactionId}), subscription ${payment.subscriptionId} activated.`,
        );
      } else if (FAILED_STATUSES.has(status)) {
        // A declined checkout the user started themselves doesn't change the
        // subscription — it stays exactly as it was before they tried to pay.
        this.logger.warn(
          `Payment ${payment.id} ${status} (Wompi ${transactionId}), subscription not activated.`,
        );
      }

      await this.recordEvent(tx, checksum);
    });
  }

  // Switches the subscription to the plan that was paid for (effective
  // immediately, so an upgrade's extra seats are usable right away) and
  // extends from whichever is later: the current period's end (paying early
  // doesn't lose the days already paid for) or now (paying after expiry
  // doesn't backdate the new period). Clears any grace period and unlocks
  // the organization, same end state as SubscriptionsService.recordCashPayment.
  private async activateSubscription(
    tx: Prisma.TransactionClient,
    paymentId: string,
    subscriptionId: string,
    planId?: string,
  ) {
    const subscription = await tx.subscription.findUnique({
      where: { id: subscriptionId },
      include: { plan: true },
    });

    if (!subscription) return null;

    const paidPlan = planId
      ? await tx.plan.findUnique({ where: { id: planId } })
      : null;
    if (!paidPlan) {
      this.logger.warn(
        `Payment ${paymentId}: paid plan ${planId ?? '(none in reference)'} not found — extending the current plan instead.`,
      );
    }
    const plan = paidPlan ?? subscription.plan;

    const now = new Date();
    const periodStart =
      subscription.currentPeriodEnd > now ? subscription.currentPeriodEnd : now;
    const periodEnd = new Date(
      periodStart.getTime() + plan.durationDays * MS_PER_DAY,
    );

    await tx.payment.update({
      where: { id: paymentId },
      data: { periodStart, periodEnd },
    });

    await tx.subscription.update({
      where: { id: subscription.id },
      data: {
        planId: plan.id,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodEnd: periodEnd,
        gracePeriodEndsAt: null,
      },
    });

    const { slug } = await tx.organization.update({
      where: { id: subscription.organizationId },
      data: { active: true },
      select: { slug: true },
    });
    return slug;
  }

  // By transaction id first (set on the first event we see for a payment),
  // falling back to the reference for that very first event. Note that
  // activateSubscription rewrites periodStart, so the reference fallback
  // only works until the transaction id is linked — which it always is by
  // the time periodStart changes.
  private async findPayment(
    transactionId: string,
    reference?: string,
  ): Promise<PaymentRef | null> {
    const byTransactionId = await this.prisma.payment.findUnique({
      where: { wompiTransactionId: transactionId },
    });
    if (byTransactionId) return byTransactionId;

    const match = reference ? REFERENCE_PATTERN.exec(reference) : null;
    if (!match) return null;

    return this.prisma.payment.findFirst({
      where: {
        subscriptionId: match[1],
        method: 'WOMPI',
        periodStart: new Date(Number(match[2])),
      },
    });
  }

  private async recordEvent(
    client: Prisma.TransactionClient | PrismaService,
    checksum?: string,
  ) {
    if (!checksum) return;
    await client.wompiWebhookEvent.create({ data: { checksum } });
  }
}
