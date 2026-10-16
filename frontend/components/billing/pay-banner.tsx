"use client"

import { useEffect, useState } from "react"
import { paymentState, type MySubscription } from "@/lib/billing"

/**
 * Aviso en todas las secciones cuando toca pagar: en el día de gracia (y al entrar la
 * lleva una vez a Suscripción) y en los 3 días antes de que venza el plan.
 */
export function PayBanner({ subscription, page }: { subscription: MySubscription; page: string }) {
  const [now] = useState(() => Date.now())
  const state = subscription.hasAccess ? paymentState(subscription, now) : null
  const grace = state?.reason === "grace"

  useEffect(() => {
    if (grace && window.location.hash !== "#suscripcion") window.location.hash = "suscripcion"
    // Solo al entrar al panel: después puede ir a otras secciones durante el día de gracia.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!state?.canPay || page === "suscripcion" || (state.reason !== "grace" && state.reason !== "soon")) return null
  return (
    <a href="#suscripcion" className={`callout pay-banner ${grace ? "c-peach" : "c-banana"}`}>
      <span>
        <b>{grace ? "Tu acceso mensual está a punto de vencer." : `Tu plan vence en ${state.daysLeft === 1 ? "1 día" : `${state.daysLeft} días`}.`}</b>{" "}
        {grace ? "Actualiza tu pago hoy para no perder el acceso." : "Puedes pagar desde ya sin perder días."}
      </span>
      <span className="pay-banner-go">Pagar</span>
    </a>
  )
}
