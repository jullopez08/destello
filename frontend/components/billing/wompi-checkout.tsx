"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Script from "next/script"
import { Icon } from "@/components/ui/icon"
import { api, errorMessage } from "@/lib/api"

// Lo mínimo del global de widget.js de Wompi que se usa aquí.
declare global {
  interface Window {
    WidgetCheckout?: new (config: {
      currency: string
      amountInCents: number
      reference: string
      publicKey: string
      signature: { integrity: string }
      redirectUrl?: string
      customerData?: { email?: string }
    }) => { open: (callback: (result: { transaction?: { id: string } }) => void) => void }
  }
}

interface CheckoutSession {
  reference: string
  amountInCents: number
  currency: string
  signature: string
  customerEmail: string
}

const WIDGET_SRC = "https://checkout.wompi.co/widget.js"
const CONFIRMATION_PATH = "/pago/confirmacion"

const isLoopback = (h: string) => h === "localhost" || h === "[::1]" || h.startsWith("127.")

// Abre el checkout de Wompi para el plan asignado a la empresa. La firma, el
// monto y la referencia salen del backend (POST /payments/signature, sin
// body): el navegador nunca decide cuánto se cobra. El pago solo se crea al
// pulsar, no al cargar la página.
export function WompiCheckout({ label = "Pagar con Wompi" }: { label?: string }) {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [opening, setOpening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const publicKey = process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY

  async function pay() {
    if (!window.WidgetCheckout || !publicKey) {
      setError("El pago en línea aún no está disponible. Inténtalo más tarde.")
      return
    }
    setError(null)
    setOpening(true)
    try {
      const session = await api<CheckoutSession>("/payments/signature", { method: "POST" })
      const checkout = new window.WidgetCheckout({
        currency: session.currency,
        amountInCents: session.amountInCents,
        reference: session.reference,
        publicKey,
        signature: { integrity: session.signature },
        // Wompi responde 403 si redirect-url apunta a localhost: en local se omite.
        redirectUrl: isLoopback(window.location.hostname) ? undefined : `${window.location.origin}${CONFIRMATION_PATH}`,
        customerData: { email: session.customerEmail },
      })
      checkout.open((result) => {
        if (result.transaction?.id) router.push(`${CONFIRMATION_PATH}?id=${encodeURIComponent(result.transaction.id)}`)
      })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setOpening(false)
    }
  }

  return (
    <div className="stack" style={{ gap: 8 }}>
      <Script id="wompi-widget" src={WIDGET_SRC} onReady={() => setReady(true)} onError={() => setError("No se pudo cargar la pasarela de pago. Revisa tu conexión.")} />
      <div>
        <button type="button" className="btn primary block" onClick={pay} disabled={!ready || opening}>
          <Icon name="suscripcion" />
          {opening ? "Abriendo…" : label}
        </button>
      </div>
      {error ? <p className="err">{error}</p> : null}
    </div>
  )
}
