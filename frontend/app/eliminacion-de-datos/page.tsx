import type { Metadata } from "next"
import Link from "next/link"
import { LegalPage, OWNER } from "@/components/legal/legal-page"

export const metadata: Metadata = {
  title: "Eliminación de datos · Destello",
  description: "Cómo y cuándo se borran los datos de un negocio en Destello, y cómo pedir el borrado antes.",
}

const mail = <a href={`mailto:${OWNER.email}`}>{OWNER.email}</a>

// Debe coincidir con data-retention (borrado a 6 meses de inactividad, purge-organization-data.ts) y con la limpieza de
// inscripciones sin terminar (1 día). Borrador: revisar con abogado.
export default function EliminacionPage() {
  return (
    <LegalPage title="Eliminación de datos">
      <h2>Borrado automático de una cuenta inactiva</h2>
      <p>Cuando un negocio queda inactivo (porque canceló o porque el plan venció sin pago), Destello hace esto:</p>
      <ul>
        <li>Guarda todos sus datos durante <b>6 meses</b>, por si decide volver. Si paga de nuevo antes de ese plazo, todo sigue igual.</li>
        <li>Avisa por correo a la cuenta de administración cuando empieza el plazo, un mes antes y una semana antes del borrado.</li>
        <li>
          Al cumplirse los 6 meses, borra <b>todo</b>: pedidos y datos de los clientes, mesas, comandas y cuentas, el equipo y sus aparatos,
          turnos de caja con sus fotos de facturas, proveedores, repartidores, insumos, compras, recetas, productos, la carta del negocio, los
          pagos y la cuenta de administración. No se puede recuperar.
        </li>
      </ul>

      <h2>Pedir el borrado antes</h2>
      <p>
        Escriba desde el correo de la cuenta a {mail} con el asunto <b>“Eliminar mis datos — [nombre del negocio]”</b>. Confirmaremos que es usted y
        borraremos todo en máximo quince (15) días hábiles, como cualquier reclamo de la{" "}
        <Link href="/privacidad">Política de privacidad</Link>.
      </p>
      <p>
        Antes de pedirlo, puede descargar sus informes en Excel desde cada sección (Caja, Pedidos, Insumos, Compras y Analítica). Si quiere una copia
        completa, pídala en el mismo correo y se la enviamos antes de borrar.
      </p>

      <h2>Inscripciones sin terminar</h2>
      <p>Si empezó a inscribirse y no terminó, sus datos y la carta que subió se borran solos al día siguiente.</p>

      <h2>Si usted es cliente o trabajador de un negocio</h2>
      <p>
        El negocio es el responsable de sus datos: pídale a él que los corrija o los borre (un pedido, sus datos de contacto o su acceso como
        mesero o cocina). Si no le responde, escríbanos y le ayudamos a que se atienda.
      </p>
    </LegalPage>
  )
}
