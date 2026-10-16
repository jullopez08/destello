// GET /subscriptions/me (backend: SubscriptionsService.findMine)

export interface SubscriptionPayment {
  id: string
  amount: number
  status: string
  method: "WOMPI" | "CASH"
  createdAt: string
}

export type MySubscription =
  | { hasAccess: false; awaitingFirstPayment: boolean }
  | {
      hasAccess: true
      plan: { name: string; price: number; durationDays: number; isTrial: boolean }
      amountDue: number
      awaitingFirstPayment: boolean
      status: "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELLED"
      currentPeriodEnd: string
      payments: SubscriptionPayment[]
      organizationActive: boolean
    }

export type PaidSubscription = Extract<MySubscription, { hasAccess: true }>

/** Días que el botón de pago aparece antes de que venza el plan. */
export const PAY_EARLY_DAYS = 3

/**
 * Cuándo se pide el pago (decisión de Julieth, 2026-10-16): panel en pausa, falta el
 * primer pago, día de gracia (PAST_DUE) o faltan 3 días o menos para vencer. Al día o
 * en prueba gratis: sin botón. `daysLeft` cuenta días enteros hasta `currentPeriodEnd`.
 */
export function paymentState(s: PaidSubscription, now: number) {
  const daysLeft = Math.ceil((new Date(s.currentPeriodEnd).getTime() - now) / 86400000)
  const reason: "blocked" | "first" | "grace" | "soon" | null = !s.organizationActive
    ? "blocked"
    : s.awaitingFirstPayment
      ? "first"
      : s.status === "PAST_DUE" || s.status === "CANCELLED"
        ? "grace"
        : !s.plan.isTrial && daysLeft <= PAY_EARLY_DAYS
          ? "soon"
          : null
  return { reason, canPay: reason !== null && s.amountDue > 0, daysLeft: Math.max(0, daysLeft) }
}
