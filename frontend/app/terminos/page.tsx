import type { Metadata } from "next"
import Link from "next/link"
import { LegalPage, OWNER } from "@/components/legal/legal-page"

export const metadata: Metadata = {
  title: "Términos y condiciones · Destello",
  description: "Condiciones de uso de Destello, el panel de pedidos, producción, inventario, mesas y caja para negocios de comida.",
}

const mail = <a href={`mailto:${OWNER.email}`}>{OWNER.email}</a>

// Términos (Julieth, 2026-10-21). La sección 8 es el contrato de transmisión de datos del art. 25 del Decreto 1377 de
// 2013 (Destello como encargado de los datos que registra el negocio). Borrador: revisar con abogado.
export default function TerminosPage() {
  return (
    <LegalPage title="Términos y condiciones">
      <p>
        Estos términos regulan el uso de Destello, un servicio de {OWNER.name} (persona natural, NIT {OWNER.nit}, domiciliada en {OWNER.city}) para
        que pastelerías, panaderías, cocinas ocultas y restaurantes organicen sus pedidos, su producción, su inventario, sus mesas y su caja. Al
        inscribirse o aceptarlos en su primer ingreso, usted los acepta en nombre de su negocio y declara que tiene facultad para hacerlo.
      </p>

      <h2>1. El servicio</h2>
      <p>
        Destello es un panel en línea para registrar pedidos y domicilios, planear la producción del día, llevar el inventario de insumos, registrar
        compras y proveedores, costear recetas y productos, atender mesas con meseros y pantalla de cocina, cobrar en caja y ver la analítica del
        negocio. Funciona en el navegador y se puede instalar en el celular.
      </p>
      <p>
        Los cálculos (costos, márgenes, precios sugeridos, producción, impuesto incluido en el precio, propina sugerida, lo que debería haber en la
        caja y los informes en Excel) son una <b>ayuda</b>. Las decisiones del negocio, sus precios y sus obligaciones con la DIAN, con sus clientes
        y con sus trabajadores son responsabilidad del negocio. <b>Destello no expide facturas electrónicas</b> ni presenta declaraciones de
        impuestos: los informes son para usted y su contador.
      </p>

      <h2>2. La cuenta y el equipo</h2>
      <ul>
        <li>Cada negocio tiene una cuenta de administración (la dueña o el dueño). Usted es responsable de lo que se haga con ella y de mantener su contraseña en secreto.</li>
        <li>
          Puede dar acceso a su equipo (meseros y pantalla de cocina) con un enlace y un PIN. Usted decide quién entra, puede cambiar el enlace o el
          PIN, desconectar aparatos y quitar personas en cualquier momento, y responde por lo que haga su equipo en Destello.
        </li>
        <li>Debe darnos información verdadera y mantenerla al día. Si sospecha que alguien entró a su cuenta, cambie la contraseña y escríbanos.</li>
      </ul>

      <h2>3. Comprobar que el negocio es real</h2>
      <p>
        Al inscribirse le pedimos el Instagram o Google Maps del negocio y su carta. Podemos revisarlos antes o después de dar acceso. Si no logramos
        comprobar que el negocio es real, la cuenta queda en pausa sin borrar sus datos, y puede escribirnos para revisarla.
      </p>

      <h2>4. Prueba gratuita, planes y pagos</h2>
      <ul>
        <li>Puede empezar con una prueba gratuita, sin tarjeta. Al terminar, la cuenta pasa al plan mensual, cuyo precio se muestra antes de pagar.</li>
        <li>Los pagos se hacen por Wompi (tarjeta, PSE, Nequi u otros medios que Wompi ofrezca). Cada pago aprobado extiende el plan por su período.</li>
        <li>Si un período vence sin pago, hay un (1) día de gracia; después, el panel queda en pausa y solo se ve la sección de Suscripción hasta que se pague. Los datos no se pierden durante ese tiempo.</li>
        <li>Avisamos cualquier cambio de precio con al menos treinta (30) días de antelación. Cancelaciones y reembolsos: <Link href="/reembolsos">Política de reembolsos</Link>.</li>
      </ul>

      <h2>5. Uso permitido</h2>
      <p>
        No puede usar Destello para actividades ilegales, para intentar entrar a la cuenta o los datos de otro negocio, para afectar el servicio
        (por ejemplo, con robots o ataques), para subir archivos dañinos ni para revenderlo sin autorización. Si eso pasa, podemos suspender la
        cuenta y avisar a las autoridades cuando corresponda.
      </p>

      <h2>6. Sus datos y su contenido</h2>
      <p>
        Los datos que usted registra (pedidos, recetas, precios, inventario, ventas) son de su negocio. Puede descargarlos en Excel desde cada
        sección y pedirnos una copia completa antes de irse. Destello, su diseño, sus dibujos y su código son de {OWNER.name}; usarlo no le da
        derechos sobre ellos más allá del uso del servicio.
      </p>

      <h2>7. WhatsApp</h2>
      <p>Sus clientes le siguen escribiendo a su propio WhatsApp. Hoy Destello no envía ni lee mensajes de WhatsApp: los pedidos los registra usted en el panel. Si más adelante ofrecemos esa conexión, será opcional y le pediremos aceptarla.</p>

      <h2>8. Tratamiento de datos por cuenta del negocio</h2>
      <p>
        Sobre los datos personales de sus clientes, su equipo, sus proveedores y sus repartidores, <b>su negocio es el responsable</b> y Destello
        el <b>encargado</b> (Ley 1581 de 2012). Esta sección es el contrato de transmisión del artículo 25 del Decreto 1377 de 2013:
      </p>
      <ul>
        <li><b>Alcance:</b> Destello guarda y procesa esos datos solo para prestarle el servicio descrito en la sección 1, siguiendo lo que usted registra y configura.</li>
        <li><b>Principios y fines:</b> los trata conforme a la ley y a la <Link href="/privacidad">Política de privacidad</Link>, nunca para fines propios, publicidad ni venta.</li>
        <li><b>Seguridad y confidencialidad:</b> los protege con las medidas descritas en la Política de privacidad y guarda reserva sobre ellos, también después de terminar el servicio.</li>
        <li><b>Proveedores:</b> usa solo los terceros listados en la Política de privacidad, y avisa con quince (15) días si agrega otro.</li>
        <li><b>Derechos de los titulares:</b> si una persona le pide a usted conocer, corregir o borrar sus datos, le ayudamos a atenderlo; si nos escribe a nosotros, se lo remitimos.</li>
        <li><b>Incidentes:</b> si algo pone en riesgo esos datos, le avisamos sin demora para que pueda cumplir sus deberes.</li>
        <li><b>Al terminar:</b> los datos se borran como explica <Link href="/eliminacion-de-datos">Eliminación de datos</Link>.</li>
      </ul>
      <p>
        <b>Usted se compromete</b> a tener la autorización de esas personas para registrar sus datos, a informarles para qué los usa (por ejemplo,
        con un aviso de privacidad de su negocio) y a atender sus solicitudes. A su equipo debe informarle que Destello registra sus mesas, ventas y
        propinas para la analítica de su negocio.
      </p>

      <h2>9. Disponibilidad</h2>
      <p>
        Trabajamos para que el servicio esté disponible siempre, pero puede haber interrupciones por mantenimiento o fallas de terceros (servidores,
        internet, pagos). Le recomendamos descargar sus informes con regularidad y no depender de Destello como único registro de información crítica.
      </p>

      <h2>10. Inactividad y borrado</h2>
      <p>Si la cuenta queda inactiva, sus datos se guardan 6 meses y luego se borran por completo, con avisos previos por correo. Detalles en <Link href="/eliminacion-de-datos">Eliminación de datos</Link>.</p>

      <h2>11. Responsabilidad</h2>
      <p>
        En la medida en que la ley lo permita, la responsabilidad de Destello por cualquier reclamo se limita al valor pagado por el negocio en los
        tres (3) meses anteriores al hecho, salvo dolo o culpa grave. Nada de esto limita los derechos que le dan el Estatuto del Consumidor (Ley
        1480 de 2011) ni la ley de protección de datos.
      </p>

      <h2>12. Cambios a estos términos</h2>
      <p>
        Podemos mejorar o cambiar funciones. Si cambiamos estos términos, actualizaremos la fecha de arriba y le avisaremos por correo antes de
        aplicar un cambio importante; si no está de acuerdo, puede cancelar sin penalización.
      </p>

      <h2>13. Ley aplicable y contacto</h2>
      <p>
        Estos términos se rigen por las leyes de Colombia. Antes de acudir a una autoridad, escríbanos a {mail} para buscar una solución directa.
        Usted conserva su derecho a acudir a la Superintendencia de Industria y Comercio. Dirección: {OWNER.address}. Teléfono: {OWNER.phone}.
      </p>
    </LegalPage>
  )
}
