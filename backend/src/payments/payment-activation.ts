import { Logger } from '@nestjs/common';
import { Prisma, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WOMPI_CURRENCY, type WompiTransaction } from '../wompi/wompi.service';

// Aplicar el resultado de una transacción de Wompi a la suscripción. Lo usan el
// webhook y la consulta de respaldo (PaymentsService); solo la llamada que de
// verdad cambia el pago a APPROVED extiende la suscripción.

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

const FAILED_STATUSES = new Set(['DECLINED', 'VOIDED', 'ERROR']);

type PaymentRef = {
  id: string;
  subscriptionId: string;
  amount: number;
  wompiTransactionId: string | null;
};

export async function applyTransaction(
prisma: PrismaService,
logger: Logger,
transaction: WompiTransaction,
checksum?: string,
) {
  const transactionId = String(transaction.id);
  const status = String(transaction.status);
  const payment = await findPayment(
    prisma,
    transactionId,
    transaction.reference,
  );

  if (!payment) {
    logger.warn(
      `No local Payment for Wompi transaction ${transactionId} (reference ${transaction.reference}), ignoring.`,
    );
    await recordEvent(prisma, checksum);
    return;
  }

  if (
    payment.wompiTransactionId &&
    payment.wompiTransactionId !== transactionId
  ) {
    logger.error(
      `Payment ${payment.id} is already linked to Wompi transaction ${payment.wompiTransactionId}, not ${transactionId} — ignoring.`,
    );
    await recordEvent(prisma, checksum);
    return;
  }

  // The integrity signature already binds the widget to this amount, but
  // it's re-checked here so an activation can never depend on that alone.
  if (
    transaction.amount_in_cents !== payment.amount ||
    transaction.currency !== WOMPI_CURRENCY
  ) {
    logger.error(
      `Wompi transaction ${transactionId} is ${transaction.amount_in_cents} ${transaction.currency}, but Payment ${payment.id} expects ${payment.amount} ${WOMPI_CURRENCY} — not applying. Needs manual review.`,
    );
    await recordEvent(prisma, checksum);
    return;
  }

  // Se asigna dentro del callback de $transaction: el `as` evita que TS lo
  // estreche a `null` aquí y lo trate como `never` después de la transacción.

  await prisma.$transaction(async (tx) => {
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
        logger.warn(
          `Payment ${payment.id} was already APPROVED and Wompi now reports ${status} for ${transactionId} — left as is. Needs manual review.`,
        );
      }
    } else if (status === 'APPROVED') {
      const planId = REFERENCE_PATTERN.exec(transaction.reference ?? '')?.[3];
      await activateSubscription(
        tx,
        logger,
        payment.id,
        payment.subscriptionId,
        planId,
      );
      logger.log(
        `Payment ${payment.id} approved (Wompi ${transactionId}), subscription ${payment.subscriptionId} activated.`,
      );
    } else if (FAILED_STATUSES.has(status)) {
      // A declined checkout the user started themselves doesn't change the
      // subscription — it stays exactly as it was before they tried to pay.
      logger.warn(
        `Payment ${payment.id} ${status} (Wompi ${transactionId}), subscription not activated.`,
      );
    }

    await recordEvent(tx, checksum);
  });
}

// Switches the subscription to the plan that was paid for (effective
// immediately, so an upgrade's extra seats are usable right away) and
// extends from whichever is later: the current period's end (paying early
// doesn't lose the days already paid for) or now (paying after expiry
// doesn't backdate the new period). Clears any grace period and unlocks
// the organization, same end state as SubscriptionControlsService.recordCashPayment.
export async function activateSubscription(
tx: Prisma.TransactionClient,
logger: Logger,
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
    logger.warn(
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
export async function findPayment(
prisma: PrismaService,
transactionId: string,
  reference?: string,
): Promise<PaymentRef | null> {
  const byTransactionId = await prisma.payment.findUnique({
    where: { wompiTransactionId: transactionId },
  });
  if (byTransactionId) return byTransactionId;

  const match = reference ? REFERENCE_PATTERN.exec(reference) : null;
  if (!match) return null;

  return prisma.payment.findFirst({
    where: {
      subscriptionId: match[1],
      method: 'WOMPI',
      periodStart: new Date(Number(match[2])),
    },
  });
}

export async function recordEvent(
  client: Prisma.TransactionClient | PrismaService,
  checksum?: string,
) {
  if (!checksum) return;
  await client.wompiWebhookEvent.create({ data: { checksum } });
}
