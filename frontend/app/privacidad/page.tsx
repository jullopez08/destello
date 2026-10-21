import type { Metadata } from "next"
import Link from "next/link"
import { LEGAL_UPDATED, LegalPage, OWNER, ProcessorsTable } from "@/components/legal/legal-page"

export const metadata: Metadata = {
  title: "Política de privacidad · Destello",
  description: "Política de tratamiento de datos personales de Destello, conforme a la Ley 1581 de 2012 y el Decreto 1377 de 2013.",
}

const mail = <a href={`mailto:${OWNER.email}`}>{OWNER.email}</a>

// Política de tratamiento de datos (Julieth, 2026-10-21). Sigue el contenido mínimo del art. 13 del Decreto 1377 de
// 2013 (compilado en el Decreto 1074 de 2015) y los derechos y plazos de la Ley 1581 de 2012. Debe decir solo lo que
// la app hace de verdad: si cambia lo que se guarda, se cambia aquí y LEGAL_UPDATED. Borrador: revisar con abogado.
export default function PrivacidadPage() {
  return (
    <LegalPage title="Política de tratamiento de datos personales">
      <p>
        Esta política explica qué datos personales trata Destello, para qué, por cuánto tiempo, con quién los comparte y cómo puede usted ejercer
        sus derechos. Cumple la Ley Estatutaria 1581 de 2012, el Decreto 1377 de 2013 (compilado en el Decreto 1074 de 2015) y las instrucciones
        de la Superintendencia de Industria y Comercio (SIC).
      </p>

      <h2>1. Quién es el responsable</h2>
      <ul>
        <li><b>Responsable:</b> {OWNER.name}, persona natural, NIT {OWNER.nit}. Destello es un producto suyo.</li>
        <li><b>Domicilio:</b> {OWNER.city}. <b>Dirección:</b> {OWNER.address}.</li>
        <li><b>Correo para datos personales:</b> {mail}. <b>Otros asuntos:</b> <a href={`mailto:${OWNER.contactEmail}`}>{OWNER.contactEmail}</a>.</li>
        <li><b>Teléfono:</b> <a href={`tel:+57${OWNER.phone.replace(/\D/g, "")}`}>{OWNER.phone}</a>.</li>
        <li><b>Quién atiende sus consultas y reclamos:</b> la misma titular, {OWNER.name}, en el correo anterior.</li>
      </ul>

      <h2>2. Dos papeles distintos: responsable y encargado</h2>
      <p>
        <b>Destello es responsable</b> de los datos de las personas que crean y administran una cuenta (la dueña o el dueño del negocio) y de
        quienes se inscriben en la página. Decide para qué se usan esos datos y responde por ellos.
      </p>
      <p>
        <b>Destello es encargado</b> de los datos que cada negocio registra sobre otras personas: sus clientes, su equipo (meseros y cocina), sus
        proveedores y sus repartidores. Sobre esos datos, <b>el responsable es el negocio</b>: Destello solo los guarda y procesa para prestarle el
        servicio, siguiendo sus instrucciones, y nunca los usa para fines propios. Las condiciones de ese encargo están en los{" "}
        <Link href="/terminos">Términos y condiciones</Link> (sección «Tratamiento de datos por cuenta del negocio»).
      </p>

      <h2>3. Qué datos tratamos y para qué</h2>
      <h3>Como responsable</h3>
      <ul>
        <li>
          <b>Cuenta de la dueña:</b> nombre, correo, contraseña (guardada cifrada con bcrypt; nadie la puede leer, ni siquiera nosotros), fecha y
          versión de los documentos que aceptó. <i>Para:</i> darle acceso, mantener su cuenta segura y avisarle sobre ella.
        </li>
        <li>
          <b>Al entrar desde un aparato nuevo:</b> la dirección IP y el tipo de navegador se usan en ese momento para enviarle el aviso «alguien
          entró a su cuenta» y no se guardan. En su navegador queda la cookie <code>known_device</code> para no repetir el aviso.
        </li>
        <li>
          <b>Inscripción:</b> su nombre, correo, WhatsApp, el nombre del negocio, el enlace de Instagram o Google Maps y la carta del negocio en PDF.
          El código de 6 dígitos se guarda cifrado y vence a los 15 minutos; una inscripción sin terminar se borra al día siguiente. <i>Para:</i>
          comprobar que el correo es suyo, que el negocio es real y que cada negocio use la prueba gratis una sola vez.
        </li>
        <li>
          <b>Pago de la suscripción:</b> el estado, el valor y el número de cada transacción. Los datos de la tarjeta o la cuenta los recibe Wompi;
          Destello nunca los ve ni los guarda. <i>Para:</i> cobrar el plan y llevar el registro de pagos.
        </li>
      </ul>
      <h3>Como encargado (por cuenta de cada negocio)</h3>
      <ul>
        <li><b>Clientes del negocio:</b> nombre, WhatsApp, dirección de entrega y lo que pidió. <i>Para:</i> registrar, producir y entregar sus pedidos.</li>
        <li>
          <b>Equipo del negocio (meseros y cocina):</b> nombre, rol, PIN (guardado cifrado), los aparatos desde donde entra (tipo de navegador y
          fecha de uso) y las mesas que atiende, con sus ventas, propinas y comandas anuladas. <i>Para:</i> que trabaje en la app con su propio
          acceso y que la dueña vea cómo va el servicio. La analítica de meseros solo la ve la dueña y no toma decisiones sola: solo informa.
        </li>
        <li><b>Proveedores y repartidores:</b> nombre, teléfono o WhatsApp, correo y dirección. <i>Para:</i> registrar compras y entregas.</li>
        <li>
          <b>Caja:</b> quién abre y cierra cada turno, lo contado y las fotos de las facturas o recibos de las salidas de efectivo, que pueden traer
          datos de quien las expidió. <i>Para:</i> que la dueña cuadre la caja. Solo la dueña las ve.
        </li>
        <li><b>Datos del negocio:</b> cuentas y llaves Bre-B, inventario, recetas, ventas y precios. Son del negocio, no de personas.</li>
      </ul>
      <p>
        No vendemos, alquilamos ni regalamos datos personales, no los usamos para publicidad y no tratamos datos sensibles (salud, biometría,
        origen, creencias) ni datos de menores de edad: el servicio es para negocios y sus trabajadores mayores de edad.
      </p>

      <h2>4. Autorización</h2>
      <p>
        La dueña autoriza el tratamiento de sus datos al inscribirse o al aceptar estos documentos en su primer ingreso; queda guardado cuándo y
        qué versión aceptó. Cada negocio debe tener la autorización de sus clientes, de su equipo, de sus proveedores y de sus repartidores para
        registrar sus datos en Destello, y conservar prueba de ella.
      </p>

      <h2>5. Sus derechos</h2>
      <p>Como titular de sus datos, usted puede (art. 8 de la Ley 1581 de 2012):</p>
      <ul>
        <li>Conocer, actualizar y rectificar sus datos, también si están incompletos o inducen a error.</li>
        <li>Pedir prueba de la autorización que dio.</li>
        <li>Saber cómo se han usado sus datos.</li>
        <li>Revocar la autorización o pedir que se borren sus datos, cuando no haya un deber legal o contractual de conservarlos.</li>
        <li>Consultar gratis sus datos al menos una vez al mes y cada vez que cambie esta política.</li>
        <li>Presentar quejas ante la Superintendencia de Industria y Comercio, después de haber hecho su reclamo ante nosotros.</li>
      </ul>

      <h2>6. Cómo ejercerlos</h2>
      <p>Escriba a {mail} con su nombre, su número de identificación, qué pide, una forma de responderle y, si los tiene, los documentos que quiera hacer valer.</p>
      <ul>
        <li><b>Consultas</b> (conocer sus datos): respondemos en máximo diez (10) días hábiles; si no alcanzamos, le avisamos y respondemos en máximo cinco (5) días hábiles más.</li>
        <li>
          <b>Reclamos</b> (corregir, borrar, revocar o denunciar un incumplimiento): respondemos en máximo quince (15) días hábiles, prorrogables
          ocho (8) días hábiles más con aviso. Si falta información, se la pedimos en los cinco (5) días siguientes; si no la envía en dos (2)
          meses, entendemos que desistió.
        </li>
        <li>
          Si usted es <b>cliente, trabajador, proveedor o repartidor de un negocio</b> que usa Destello, haga su solicitud primero al negocio, que es el
          responsable de sus datos. Si no le responde, escríbanos y le ayudamos a que se atienda.
        </li>
      </ul>

      <h2>7. Con quién compartimos los datos</h2>
      <p>
        Solo con los proveedores que necesitamos para prestar el servicio, que tratan los datos por cuenta de Destello, bajo sus acuerdos de
        tratamiento de datos y solo para lo descrito aquí:
      </p>
      <ProcessorsTable />
      <p style={{ marginTop: 10 }}>
        Estados Unidos está en la lista de países con nivel adecuado de protección de datos de la SIC. Si agregamos otro proveedor que reciba datos
        personales, avisaremos a los negocios con quince (15) días de antelación. Fuera de ellos, solo entregamos datos si una autoridad lo ordena
        con base en la ley.
      </p>

      <h2>8. Cómo los protegemos</h2>
      <ul>
        <li>Toda la conexión va cifrada (HTTPS) y el navegador está obligado a usarla siempre.</li>
        <li>Contraseñas y PIN guardados cifrados con bcrypt; los códigos y enlaces de un solo uso se guardan como huella (sha256), no tal cual.</li>
        <li>La sesión va en cookies que ningún script ni otro sitio puede leer; al salir o cambiar la contraseña, se cierran todas las sesiones.</li>
        <li>Cada negocio solo ve lo suyo: todo se filtra por negocio en el servidor y lo comprobamos con pruebas automáticas.</li>
        <li>Límite de intentos al entrar, al inscribirse y con el PIN (bloqueo temporal), captcha en la inscripción y aviso de aparato nuevo.</li>
        <li>Los archivos que se suben (logo, carta, facturas) se revisan por su contenido real, y una carta en PDF con código o adjuntos se rechaza.</li>
        <li>El servidor de datos no tiene dirección pública: solo el panel puede hablar con él.</li>
      </ul>
      <p>
        Si ocurre un incidente que ponga en riesgo datos personales, avisaremos a los negocios afectados sin demora y lo reportaremos a la SIC
        dentro de los quince (15) días hábiles siguientes a conocerlo, como ella lo exige.
      </p>

      <h2>9. Por cuánto tiempo</h2>
      <ul>
        <li>Los datos de la cuenta y del negocio, mientras la cuenta esté activa.</li>
        <li>
          Si el negocio queda inactivo (cancelación o falta de pago), los guardamos <b>6 meses</b> por si vuelve, con avisos por correo, y luego se
          borra todo. Detalles en <Link href="/eliminacion-de-datos">Eliminación de datos</Link>.
        </li>
        <li>Códigos de inscripción: 15 minutos. Inscripciones sin terminar: 1 día.</li>
      </ul>

      <h2>10. Vigencia</h2>
      <p>
        Esta versión rige desde el {new Date(LEGAL_UPDATED + "T12:00:00").toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })}.
        Las bases de datos de Destello estarán vigentes mientras se preste el servicio y por los plazos del punto anterior. Si cambiamos esta
        política, actualizaremos la fecha y avisaremos por correo antes de aplicar un cambio importante.
      </p>
    </LegalPage>
  )
}
