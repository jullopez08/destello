import type { Metadata } from "next"
import { LegalPage, OWNER } from "@/components/legal/legal-page"

export const metadata: Metadata = {
  title: "Política de reembolsos · Destello",
  description: "Cancelaciones, derecho de retracto, reembolsos y reversión del pago de la suscripción a Destello.",
}

const mail = <a href={`mailto:${OWNER.email}`}>{OWNER.email}</a>

// Reembolsos (Julieth, 2026-10-21): Ley 1480 de 2011 (Estatuto del Consumidor) art. 47 (retracto en ventas a distancia),
// art. 51 (reversión del pago) y Ley 2439 de 2024 (devolución en máximo 15 días calendario). Borrador: revisar con abogado.
export default function ReembolsosPage() {
  return (
    <LegalPage title="Política de reembolsos">
      <h2>1. Principio general</h2>
      <p>
        Queremos que pague solo por lo que le sirve. Esta política se aplica sin perjuicio de los derechos que le da el Estatuto del Consumidor
        (Ley 1480 de 2011), que prevalecen si hay algún conflicto.
      </p>

      <h2>2. Prueba gratuita</h2>
      <p>Durante la prueba gratuita no hay ningún cobro y puede dejar de usar el servicio cuando quiera. No pedimos tarjeta para empezarla.</p>

      <h2>3. Primer pago: puede arrepentirse</h2>
      <p>
        Si después de su <b>primer pago</b> decide que Destello no es para usted, puede pedir la devolución completa dentro de los <b>siete (7) días
        calendario</b> siguientes, o dentro de los <b>cinco (5) días hábiles</b> del derecho de retracto de la ley (art. 47 de la Ley 1480 de 2011),
        lo que le dé más tiempo. No tiene que explicar por qué.
      </p>

      <h2>4. Pagos siguientes y cancelación</h2>
      <ul>
        <li>Puede cancelar cuando quiera. Conserva el acceso hasta el final del período que ya pagó.</li>
        <li>No hacemos devoluciones proporcionales por los días que no use de un período ya empezado, salvo lo del punto 3.</li>
        <li>Si el período vence sin pago, el panel queda en pausa; ese tiempo de pausa no se cobra ni genera devolución.</li>
      </ul>

      <h2>5. Cobros que no reconoce: reversión del pago</h2>
      <p>
        Si pagó con tarjeta u otro medio electrónico y fue víctima de fraude, la operación no la hizo usted o no recibió el servicio, puede pedir la
        reversión del pago (art. 51 de la Ley 1480 de 2011): escríbanos y avísele a su banco dentro de los cinco (5) días hábiles siguientes a
        enterarse. Haremos el trámite con Wompi.
      </p>

      <h2>6. Fallas del servicio</h2>
      <p>
        Si el servicio permanece caído más de 48 horas seguidas por causas que dependan de Destello, le damos un crédito proporcional al tiempo de
        interrupción en su siguiente período.
      </p>

      <h2>7. Cambios de precio</h2>
      <p>Avisamos cualquier cambio de precio con al menos treinta (30) días de antelación por correo. Si no está de acuerdo, puede cancelar antes de que rija, sin penalización.</p>

      <h2>8. Cómo pedir una cancelación o una devolución</h2>
      <ul>
        <li>Escriba a {mail} con el asunto <b>“Cancelación/Reembolso — [nombre del negocio]”</b>, desde el correo de la cuenta.</li>
        <li>Respondemos dentro de los dos (2) días hábiles siguientes.</li>
        <li>
          Si procede la devolución, la hacemos al mismo medio con que pagó en máximo <b>quince (15) días calendario</b> (Ley 2439 de 2024). Los
          tiempos de acreditación de su banco o de Wompi pueden sumar unos días.
        </li>
      </ul>
    </LegalPage>
  )
}
