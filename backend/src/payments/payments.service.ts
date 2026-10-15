import { BadGatewayException, BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CurrentUserData } from '../common/decorators/current-user.decorator';
import { amountDue, canManageBilling } from '../subscriptions/subscriptions.service';
import { WOMPI_CURRENCY, WompiService, type WompiTransaction, type WompiWebhookPayload } from '../wompi/wompi.service';
import { applyTransaction } from './payment-activation';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Wompi transaction ids look like "15113-1718921355-38406" — anything else is
// rejected before it's interpolated into an outbound URL.
const TRANSACTION_ID_PATTERN = /^[A-Za-z0-9-]{1,64}$/;

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

      await applyTransaction(this.prisma, this.logger, transaction, checksum);
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
      await applyTransaction(this.prisma, this.logger, transaction);
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
}
