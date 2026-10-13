import type { Metadata } from "next"
import Link from "next/link"
import { LegalPage, OWNER } from "@/components/legal/legal-page"

export const metadata: Metadata = {
  title: "Términos y condiciones · Destello",
  description: "Condiciones de uso de Destello, el panel de pedidos, producción e inventario para pastelerías y panaderías.",
}

export default function TerminosPage() {
  return (
    <LegalPage title="Términos y condiciones">
      <p>
        Estos términos regulan el uso de Destello, un servicio de {OWNER.name} (NIT {OWNER.nit}) para que pastelerías, reposterías, panaderías y
        cocinas ocultas organicen sus pedidos, su producción y su inventario. Al aceptar en su primer ingreso, usted, en nombre de su negocio, los acepta.
      </p>

      <h2>1. El servicio</h2>
      <p>
        Destello es un panel en línea para registrar pedidos, calcular la producción del día, llevar el inventario de insumos por peso, volumen o
        unidad, registrar compras y proveedores, costear recetas y productos, y ver la analítica de ventas. Los cálculos (costos, márgenes, precios
        sugeridos, cantidades a producir) son una ayuda: las decisiones del negocio y sus resultados son responsabilidad del negocio.
      </p>

      <h2>2. La cuenta</h2>
      <ul>
        <li>Cada negocio tiene una cuenta de administración. Usted es responsable de lo que se haga con ella y de mantener su contraseña en secreto.</li>
        <li>Debe darnos información verdadera y mantenerla al día.</li>
        <li>Si sospecha que alguien entró a su cuenta, cambie la contraseña y escríbanos.</li>
      </ul>

      <h2>3. Prueba gratuita, planes y pagos</h2>
      <ul>
        <li>Puede empezar con una prueba gratuita, sin tarjeta. Al terminar, la cuenta pasa al plan mensual.</li>
        <li>Los pagos se hacen por Wompi (tarjeta, PSE, Nequi u otros medios que Wompi ofrezca). Cada pago aprobado extiende el plan por su período.</li>
        <li>Si un período vence sin pago, hay un (1) día de gracia; después, el panel queda en pausa y solo se ve la sección de Suscripción hasta que se pague. Los datos no se pierden durante ese tiempo.</li>
        <li>Las cancelaciones y reembolsos se rigen por la <Link href="/reembolsos">Política de reembolsos</Link>.</li>
      </ul>

      <h2>4. Uso permitido</h2>
      <p>No puede usar Destello para actividades ilegales, para intentar acceder a datos de otros negocios, para afectar el funcionamiento del servicio ni para revenderlo sin autorización.</p>

      <h2>5. Datos del negocio y de sus clientes</h2>
      <p>
        Los datos que usted registra son de su negocio. Sobre los datos de sus clientes (nombre, teléfono, dirección), su negocio es el responsable
        del tratamiento y Destello el encargado, como explica la <Link href="/privacidad">Política de privacidad</Link>. Usted declara que cuenta con
        la autorización de sus clientes para registrar esos datos.
      </p>

      <h2>6. WhatsApp</h2>
      <p>Sus clientes le siguen escribiendo a su propio WhatsApp. Destello no envía ni lee mensajes de WhatsApp: los pedidos los registra usted en el panel.</p>

      <h2>7. Disponibilidad</h2>
      <p>Trabajamos para que el servicio esté disponible siempre, pero puede haber interrupciones por mantenimiento o fallas de terceros. Le recomendamos no depender de Destello como único registro de información crítica.</p>

      <h2>8. Inactividad y borrado</h2>
      <p>Si la cuenta queda inactiva, sus datos se guardan 6 meses y luego se borran por completo, con avisos previos por correo. Detalles en <Link href="/eliminacion-de-datos">Eliminación de datos</Link>.</p>

      <h2>9. Responsabilidad</h2>
      <p>En la medida en que la ley lo permita, la responsabilidad de Destello por cualquier reclamo se limita al valor pagado por el negocio en los tres (3) meses anteriores al hecho. Nada de esto limita los derechos que le da el Estatuto del Consumidor (Ley 1480 de 2011).</p>

      <h2>10. Evolución del servicio y terceros</h2>
      <p>Podemos mejorar o cambiar funciones. Si agregamos un tercero que reciba datos personales, le avisaremos con quince (15) días de antelación.</p>

      <h2>11. Cambios a estos términos</h2>
      <p>Si los cambiamos, actualizaremos la fecha de arriba y le avisaremos por correo cuando el cambio sea importante. Seguir usando el servicio después del cambio implica aceptarlo.</p>

      <h2>12. Ley aplicable y contacto</h2>
      <p>Estos términos se rigen por las leyes de Colombia. Para cualquier asunto, escriba a <a href={`mailto:${OWNER.email}`}>{OWNER.email}</a>.</p>
    </LegalPage>
  )
}
