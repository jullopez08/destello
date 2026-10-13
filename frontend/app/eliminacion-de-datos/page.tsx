import type { Metadata } from "next"
import { LegalPage, OWNER } from "@/components/legal/legal-page"

export const metadata: Metadata = {
  title: "Eliminación de datos · Destello",
}

export default function EliminacionPage() {
  return (
    <LegalPage title="Eliminación de datos">
      <h2>Borrado automático de una cuenta inactiva</h2>
      <p>Cuando un negocio queda inactivo (porque canceló o porque el plan venció sin pago), Destello hace esto:</p>
      <ul>
        <li>Guarda todos sus datos durante <b>6 meses</b>, por si decide volver. Si paga de nuevo antes de ese plazo, todo sigue igual.</li>
        <li>Avisa por correo a la cuenta de administración cuando empieza el plazo, un mes antes y una semana antes del borrado.</li>
        <li>Al cumplirse los 6 meses, borra <b>todo</b>: pedidos, datos de los clientes, proveedores, insumos, compras, recetas, productos, pagos y la cuenta de administración. No se puede recuperar.</li>
      </ul>

      <h2>Pedir el borrado antes</h2>
      <p>
        Escriba desde el correo de la cuenta a <a href={`mailto:${OWNER.email}`}>{OWNER.email}</a> con el asunto
        <b> “Eliminar mis datos — [nombre del negocio]”</b>. Confirmaremos la solicitud y borraremos todo en máximo quince (15) días hábiles.
        Si quiere una copia de sus datos antes del borrado, pídala en el mismo correo.
      </p>

      <h2>Clientes de un negocio</h2>
      <p>Si usted es cliente de una pastelería que usa Destello y quiere que borren sus datos, pídaselo al negocio. Si no le responde, escríbanos y le ayudamos.</p>
    </LegalPage>
  )
}
