import type { Metadata } from "next"
import { headers } from "next/headers"
import Link from "next/link"
import { Cookie } from "@/components/ui/cookie"

export const metadata: Metadata = {
  title: "Confirmación de pago · Destello",
  robots: { index: false, follow: false },
}

interface TransactionStatus { id: string; status: string; reference: string; amountInCents: number }
type Lookup = { ok: true; transaction: TransactionStatus } | { ok: false; message: string }

// Se le pregunta al backend, que le pregunta a Wompi: el `status` que Wompi
// pone en la URL no se cree por sí solo. Esa consulta también aplica el
// resultado a la suscripción, por si el webhook se perdió.
async function lookupTransaction(id: string): Promise<Lookup> {
  const backendUrl = process.env.BACKEND_URL ?? "http://localhost:3101"
  const forwardedFor = (await headers()).get("x-forwarded-for")
  try {
    const response = await fetch(`${backendUrl}/payments/transactions/${encodeURIComponent(id)}`, {
      headers: forwardedFor ? { "x-forwarded-for": forwardedFor } : undefined,
      cache: "no-store",
    })
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { message?: unknown } | null
      return { ok: false, message: typeof body?.message === "string" ? body.message : "No pudimos consultar el estado del pago." }
    }
    return { ok: true, transaction: (await response.json()) as TransactionStatus }
  } catch {
    return { ok: false, message: "No se pudo conectar con el servidor. Inténtalo de nuevo en unos momentos." }
  }
}

const COP = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 })

export default async function PagoConfirmacionPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const { id } = await searchParams
  const lookup: Lookup = typeof id === "string" ? await lookupTransaction(id) : { ok: false, message: "No recibimos el identificador del pago." }
  const status = lookup.ok ? lookup.transaction.status : null
  const approved = status === "APPROVED"
  const pending = status === "PENDING"

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "32px 16px" }}>
      <div className="card stack" style={{ width: "min(420px, 100%)", textAlign: "center", alignItems: "center" }}>
        <Cookie look={approved ? "star" : pending ? "" : "choco"} size={72} />
        <h1 style={{ fontSize: 30 }}>{approved ? "Pago aprobado" : pending ? "Pago en proceso" : lookup.ok ? "Pago rechazado" : "No pudimos verificar el pago"}</h1>
        <p className="muted">
          {approved
            ? "Tu suscripción quedó activa. ¡Gracias!"
            : pending
              ? "Wompi aún está procesando tu pago. Recarga esta página en unos minutos."
              : lookup.ok
                ? "Tu pago no fue aprobado y no se hizo ningún cobro. Puedes intentarlo de nuevo."
                : lookup.message}
        </p>
        {lookup.ok ? (
          <div className="card c-banana small" style={{ width: "100%", padding: "12px 16px", textAlign: "left" }}>
            <div className="row between"><span className="muted">Monto</span><b>{COP.format(lookup.transaction.amountInCents / 100)}</b></div>
            <div className="row between nowrap"><span className="muted">Transacción</span><span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{lookup.transaction.id}</span></div>
          </div>
        ) : null}
        <Link className={`btn ${approved ? "primary" : "ghost"}`} href="/access#suscripcion">
          {approved ? "Ir al panel" : "Volver"}
        </Link>
      </div>
    </main>
  )
}
