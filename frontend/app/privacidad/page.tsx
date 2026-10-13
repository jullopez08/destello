import type { Metadata } from "next"
import Link from "next/link"
import { LegalPage, OWNER, ProcessorsTable } from "@/components/legal/legal-page"

export const metadata: Metadata = {
  title: "Política de privacidad · Destello",
  description: "Política de tratamiento de datos personales de Destello conforme a la Ley 1581 de 2012.",
}

export default function PrivacidadPage() {
  return (
    <LegalPage title="Política de privacidad">
      <p>
        Esta política explica cómo Destello trata los datos personales, en cumplimiento de la Ley Estatutaria 1581 de 2012, el
        Decreto 1377 de 2013 (compilado en el Decreto 1074 de 2015) y demás normas colombianas de protección de datos.
      </p>

      <h2>1. Responsable del tratamiento</h2>
      <ul>
        <li><b>Nombre:</b> {OWNER.name}</li>
        <li><b>NIT:</b> {OWNER.nit}</li>
        <li><b>Producto:</b> Destello, un producto de {OWNER.name}</li>
        <li><b>Dirección:</b> {OWNER.address}</li>
        <li><b>Correo:</b> <a href={`mailto:${OWNER.email}`}>{OWNER.email}</a></li>
      </ul>

      <h2>2. Datos que tratamos</h2>
      <p><b>De la persona que administra el negocio (la dueña):</b> nombre, correo, contraseña (guardada cifrada, nunca en texto plano), fecha en que aceptó estos documentos, y datos técnicos de inicio de sesión (navegador, dirección IP y fecha) para avisarle si alguien entra a su cuenta desde un dispositivo nuevo.</p>
      <p><b>Del negocio:</b> nombre, logo, WhatsApp, cuentas bancarias para transferencias, repartidores, proveedores, insumos, compras, recetas, productos, precios y pedidos.</p>
      <p>
        <b>De los clientes del negocio:</b> nombre, teléfono y dirección de entrega de cada pedido que el negocio registra. Sobre estos datos,
        el negocio es el responsable del tratamiento y Destello actúa como <b>encargado</b>: los guarda y procesa solo para prestarle el servicio
        al negocio, nunca para fines propios. El negocio debe contar con la autorización de sus clientes.
      </p>
      <p><b>Del pago de la suscripción:</b> Wompi procesa los datos de pago. Destello no recibe ni guarda números de tarjeta: solo el estado, el monto y el identificador de cada transacción.</p>

      <h2>3. Para qué los usamos</h2>
      <ul>
        <li>Prestar el servicio: mostrar el panel, calcular la producción, el inventario, los costos y la analítica del negocio.</li>
        <li>Mantener la cuenta segura: inicio de sesión, recuperación de contraseña y avisos de acceso desde un dispositivo nuevo.</li>
        <li>Cobrar la suscripción y llevar el registro de pagos.</li>
        <li>Enviar avisos sobre la cuenta (por ejemplo, el borrado de datos de una cuenta inactiva).</li>
      </ul>
      <p>No vendemos ni alquilamos datos personales, ni los usamos para publicidad.</p>

      <h2>4. Cuánto tiempo los guardamos</h2>
      <p>
        Mientras la cuenta esté activa. Si el negocio queda inactivo (por cancelación o falta de pago), guardamos todo durante <b>6 meses</b> por si
        decide volver; avisamos por correo al empezar ese plazo, un mes antes y una semana antes. Al vencer, se borra <b>todo</b> de forma automática,
        incluidos los pagos. Más detalles en <Link href="/eliminacion-de-datos">Eliminación de datos</Link>.
      </p>

      <h2>5. Terceros que nos ayudan a prestar el servicio</h2>
      <p>Estos proveedores tratan datos por cuenta de Destello, solo para lo descrito arriba:</p>
      <ProcessorsTable />
      <p style={{ marginTop: 10 }}>Si agregamos un tercero que reciba datos personales, lo avisaremos a los negocios con quince (15) días de antelación.</p>

      <h2>6. Sus derechos</h2>
      <p>
        Usted puede conocer, actualizar, rectificar y suprimir sus datos, revocar la autorización y pedir prueba de ella, saber cómo se han
        usado y presentar quejas ante la Superintendencia de Industria y Comercio. Escriba a <a href={`mailto:${OWNER.email}`}>{OWNER.email}</a>:
        respondemos consultas en máximo diez (10) días hábiles y reclamos en máximo quince (15) días hábiles.
      </p>
      <p>Los clientes de un negocio deben dirigir sus solicitudes primero al negocio, que es el responsable de sus datos; nosotros le ayudamos a atenderlas.</p>

      <h2>7. Seguridad</h2>
      <p>
        Conexiones cifradas (HTTPS), contraseñas cifradas, sesiones en cookies protegidas que el navegador no deja leer a otros sitios, aislamiento
        de los datos de cada negocio y cierre de todas las sesiones al cambiar la contraseña.
      </p>

      <h2>8. Cambios a esta política</h2>
      <p>Si cambiamos esta política, actualizaremos la fecha de arriba y avisaremos por correo cuando el cambio sea importante.</p>
    </LegalPage>
  )
}
