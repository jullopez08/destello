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
