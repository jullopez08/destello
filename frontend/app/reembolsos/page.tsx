import type { Metadata } from "next"
import { LegalPage, OWNER } from "@/components/legal/legal-page"

export const metadata: Metadata = {
  title: "Política de reembolsos · Destello",
}

export default function ReembolsosPage() {
  return (
    <LegalPage title="Política de reembolsos">
      <h2>1. Principio general</h2>
      <p>Queremos que pague solo por lo que le sirve. Esta política se aplica sin perjuicio de los derechos que le da el Estatuto del Consumidor (Ley 1480 de 2011), que prevalecen en caso de conflicto.</p>

      <h2>2. Prueba gratuita</h2>
      <p>Durante la prueba gratuita no hay ningún cobro y puede dejar de usar el servicio cuando quiera. No pedimos tarjeta para empezarla.</p>

      <h2>3. Plan mensual</h2>
      <p>
        Cada pago cubre el período del plan. Si cancela, conserva el acceso hasta el final del período pagado y no se hacen reembolsos proporcionales
        por días no usados. Si cancela dentro de los primeros siete (7) días calendario después de su primer pago, le devolvemos el valor completo.
      </p>
      <p>Si el período vence sin pago, el panel queda en pausa sin que esto genere derecho a reembolso por el tiempo de pausa.</p>

      <h2>4. Fallas del servicio</h2>
      <p>Si el servicio permanece caído por más de 48 horas continuas por causas imputables a Destello, le daremos un crédito proporcional al tiempo de interrupción en su siguiente período.</p>

      <h2>5. Cambios de precio</h2>
      <p>Avisaremos cualquier cambio de precio con al menos treinta (30) días de antelación por correo. Si no está de acuerdo, puede cancelar antes de que entre en vigencia, sin penalización.</p>

      <h2>6. Cómo pedir una cancelación o reembolso</h2>
      <ul>
        <li>Escriba a <a href={`mailto:${OWNER.email}`}>{OWNER.email}</a> con el asunto <b>“Cancelación/Reembolso — [nombre del negocio]”</b>.</li>
        <li>Respondemos dentro de los dos (2) días hábiles siguientes.</li>
        <li>Si procede un reembolso, lo pagamos dentro de los diez (10) días hábiles siguientes a la aprobación.</li>
      </ul>
    </LegalPage>
  )
}
