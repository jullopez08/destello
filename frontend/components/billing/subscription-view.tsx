"use client"

import { useState } from "react"
import { Empty, PageHead } from "@/components/kitchen/shared"
import { WompiCheckout } from "./wompi-checkout"
import { paymentState, PAY_EARLY_DAYS, type MySubscription } from "@/lib/billing"
import { money } from "@/lib/kitchen/format"

const STATUS: Record<string, [string, string]> = {
  TRIALING: ["lilac", "En prueba gratis"],
  ACTIVE: ["good", "Activa"],
  PAST_DUE: ["warn", "Pago pendiente"],
  CANCELLED: ["bad", "Cancelada"],
}

const dateFmt = (iso: string) => new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" })
const days = (n: number) => (n === 1 ? "1 día" : `${n} días`)

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
  const { reason, canPay, daysLeft } = paymentState(s, now)
  const amount = s.amountDue / 100
  const endLabel = s.plan.isTrial ? "La prueba termina" : s.status === "PAST_DUE" ? "Venció el" : "Pagado hasta"

  return (
    <>
      <PageHead title="Suscripción" sub="Tu plan de Destello y tus pagos. El pago es con Wompi: tarjeta, PSE, Nequi o Bancolombia." />
      {reason === "blocked" ? (
        <div className="callout c-strawberry sub-alert">
          <b>Tu panel está en pausa por falta de pago.</b> Paga tu plan para volver a usarlo; tus datos siguen guardados.
        </div>
      ) : reason === "first" ? (
        <div className="callout c-peach sub-alert">
          <b>Falta tu primer pago.</b> Cuando Wompi lo apruebe, se abre todo el panel.
        </div>
      ) : reason === "grace" ? (
        <div className="callout c-peach sub-alert">
          <b>Tu acceso mensual está a punto de vencer.</b> Actualiza tu pago hoy: mañana el panel queda en pausa hasta que pagues.
        </div>
      ) : null}

      <div className="grid g2">
        <div className="card stack c-accent sub-summary">
          <div className="row between">
            <div>
              <span className="small">Tu plan</span>
              <h2 style={{ margin: 0 }}>{s.plan.name}</h2>
            </div>
            <span className={`chip ${tone}`}>{label}</span>
          </div>
          <div className="sub-facts">
            <div>
              <span className="small">{s.plan.isTrial ? "Valor" : "Precio"}</span>
              <b className="num">{s.plan.isTrial ? "Gratis" : `${money(amount)} / ${s.plan.durationDays} días`}</b>
            </div>
            <div>
              <span className="small">{endLabel}</span>
              <b>{dateFmt(s.currentPeriodEnd)}</b>
              {s.status !== "PAST_DUE" && reason !== "blocked" ? <span className="small">Quedan {days(daysLeft)}</span> : null}
            </div>
          </div>
        </div>

        <div className="card stack">
          {canPay ? (
            <>
              <h2 style={{ margin: 0 }}>{reason === "soon" ? `Tu plan vence en ${days(daysLeft)}` : "Pagar"}</h2>
              <p>
                Valor a pagar: <b className="num">{money(amount)}</b>
                {s.amountDue < s.plan.price ? <span className="muted"> (con tu descuento; precio normal {money(s.plan.price / 100)})</span> : null}
              </p>
              <WompiCheckout label={reason === "blocked" || reason === "grace" ? "Pagar y reactivar" : "Pagar con Wompi"} />
              <p className="small muted">Cada pago aprobado extiende tu plan {s.plan.durationDays} días. Si pagas antes de que venza no pierdes días: se suman desde la fecha de vencimiento. Si un pago se rechaza, no se cobra nada y puedes intentarlo de nuevo.</p>
            </>
          ) : s.plan.isTrial ? (
            <>
              <h2 style={{ margin: 0 }}>Cuando termine la prueba</h2>
              <p>Tu prueba es gratis y no tienes que pagar nada todavía. Al terminar, pasas al plan mensual y te pediremos el pago aquí mismo.</p>
            </>
          ) : (
            <>
              <h2 style={{ margin: 0 }}>Estás al día</h2>
              <p>No tienes nada que pagar ahora. {PAY_EARLY_DAYS} días antes de que venza tu plan aparece aquí el botón para pagar.</p>
            </>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
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
    </>
  )
}
