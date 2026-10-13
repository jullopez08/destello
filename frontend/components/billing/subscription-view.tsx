"use client"

import { useState } from "react"
import { Empty, Kpi, PageHead } from "@/components/kitchen/shared"
import { WompiCheckout } from "./wompi-checkout"
import type { MySubscription } from "@/lib/billing"
import { money } from "@/lib/kitchen/format"

const STATUS: Record<string, [string, string]> = {
  TRIALING: ["lilac", "En prueba gratis"],
  ACTIVE: ["good", "Activa"],
  PAST_DUE: ["warn", "Pago pendiente"],
  CANCELLED: ["bad", "Cancelada"],
}

const dateFmt = (iso: string) => new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" })

export function SubscriptionView({ subscription }: { subscription: MySubscription | null }) {
  const [now] = useState(() => Date.now())
  if (!subscription) return <Empty>Cargando tu suscripción…</Empty>

  if (!subscription.hasAccess) {
    return (
      <>
        <PageHead title="Suscripción" />
        <div className="card c-banana">
          <p>La suscripción de tu negocio la maneja otra persona. Pídele que revise el pago.</p>
        </div>
      </>
    )
  }

  const s = subscription
  const [tone, label] = STATUS[s.status] ?? ["", s.status]
  const blocked = !s.organizationActive
  const amount = s.amountDue / 100
  const trialLeft = s.plan.isTrial ? Math.max(0, Math.ceil((new Date(s.currentPeriodEnd).getTime() - now) / 86400000)) : null

  return (
    <>
      <PageHead title="Suscripción" sub="Tu plan de Destello y tus pagos. El pago es con Wompi: tarjeta, PSE, Nequi o Bancolombia." />
      {blocked ? (
        <div className="callout c-strawberry" style={{ marginBottom: 16 }}>
          <b>Tu panel está en pausa por falta de pago.</b> Paga tu plan para volver a usarlo; tus datos siguen guardados.
        </div>
      ) : s.awaitingFirstPayment ? (
        <div className="callout c-peach" style={{ marginBottom: 16 }}>
          <b>Falta tu primer pago.</b> Cuando Wompi lo apruebe, se abre todo el panel.
        </div>
      ) : null}
      <div className="grid g4">
        <Kpi v={s.plan.name} l="Tu plan" s={s.plan.isTrial ? "Prueba gratuita" : `${money(amount)} cada ${s.plan.durationDays} días`} c="c-accent" />
        <Kpi v={<span className={`chip ${tone}`} style={{ fontSize: 15 }}>{label}</span>} l="Estado" c="c-lilac" />
        <Kpi v={dateFmt(s.currentPeriodEnd)} l={s.plan.isTrial ? "La prueba termina" : "Pagado hasta"} s={trialLeft !== null ? `Quedan ${trialLeft} días` : undefined} c="c-sky" />
      </div>

      <div className="grid g2" style={{ marginTop: 16 }}>
        <div className="card stack">
          <h2 style={{ margin: 0 }}>{s.plan.isTrial ? "Cuando termine la prueba" : "Pagar"}</h2>
          {s.plan.isTrial ? (
            <p>Tu prueba es gratis y no tienes que pagar nada todavía. Al terminar, pasas al plan mensual y te pediremos el pago aquí mismo.</p>
          ) : (
            <>
              <p>
                Valor a pagar: <b className="num">{money(amount)}</b>
                {s.amountDue < s.plan.price ? <span className="muted"> (con tu descuento; precio normal {money(s.plan.price / 100)})</span> : null}
              </p>
              <WompiCheckout label={blocked || s.status === "PAST_DUE" ? "Pagar y reactivar" : "Pagar con Wompi"} />
              <p className="small muted">Cada pago aprobado extiende tu plan {s.plan.durationDays} días. Si un pago se rechaza, no se cobra nada y puedes intentarlo de nuevo.</p>
            </>
          )}
        </div>
        <div className="card">
          <h2>Pagos</h2>
          {s.payments.length ? (
            <div className="list">
              {s.payments.map((p) => (
                <div className="it" key={p.id}>
                  <div>
                    <b className="num">{money(p.amount / 100)}</b>
                    <div className="small muted">{dateFmt(p.createdAt)} · {p.method === "CASH" ? "Efectivo" : "Wompi"}</div>
                  </div>
                  <span className={`chip ${p.status === "APPROVED" ? "good" : p.status === "PENDING" ? "warn" : "bad"}`}>
                    {p.status === "APPROVED" ? "Aprobado" : p.status === "PENDING" ? "En proceso" : "Rechazado"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <Empty>Aún no hay pagos.</Empty>
          )}
        </div>
      </div>
    </>
  )
}
