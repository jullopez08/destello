import type { Metadata } from "next"
import { LegalPage, OWNER } from "@/components/legal/legal-page"

export const metadata: Metadata = {
  title: "Política de cookies · Destello",
  description: "Qué cookies y qué datos guarda Destello en su navegador, para qué y por cuánto tiempo.",
}

// Debe coincidir con lo que la app guarda de verdad: backend session-cookie.util.ts, auth.controller.ts (known_device),
// staff-rules.ts (staff_device, staff_session) y, en el panel, nav-memory.tsx y supply-batches-view.tsx.
const COOKIES = [
  { name: "access_token", who: "Dueña", purpose: "Mantener su sesión abierta.", duration: "1 día o hasta que sale", type: "Necesaria" },
  { name: "known_device", who: "Dueña", purpose: "Recordar que este navegador ya entró, para no enviarle el aviso de aparato nuevo cada vez.", duration: "1 año", type: "Seguridad" },
  { name: "staff_device", who: "Equipo", purpose: "Recordar que este aparato ya se conectó con el enlace del negocio, para entrar solo con el PIN.", duration: "1 año o hasta que la dueña lo desconecta", type: "Necesaria" },
  { name: "staff_session", who: "Equipo", purpose: "Mantener abierto el turno del mesero o de la cocina.", duration: "12 horas o hasta que cierra el turno", type: "Necesaria" },
]

const STORAGE = [
  { name: "Sección anterior", purpose: "Volver a donde estaba al cerrar una página legal.", duration: "Hasta cerrar la pestaña" },
  { name: "Vencimientos revisados", purpose: "No volver a mostrar el aviso de insumos que suelen vencer cuando ya los revisó.", duration: "Hasta que borre los datos del navegador" },
]

export default function CookiesPage() {
  return (
    <LegalPage title="Política de cookies">
      <p>
        Destello solo usa las cookies necesarias para funcionar y mantener su cuenta segura. <b>No usamos cookies de publicidad ni de analítica</b>,
        ni herramientas que sigan lo que hace en otros sitios. Por eso no le pedimos que acepte cookies: ninguna es opcional.
      </p>

      <h2>Cookies de Destello</h2>
      <p>Todas son de Destello, no las puede leer ningún script ni otro sitio (httpOnly) y solo viajan por conexión cifrada (HTTPS).</p>
      <div className="tbl cardify">
        <table>
          <thead>
            <tr><th>Nombre</th><th>Para qué</th><th>Quién</th><th>Tipo</th><th>Duración</th></tr>
          </thead>
          <tbody>
            {COOKIES.map((c) => (
              <tr key={c.name}><td className="c-title"><code>{c.name}</code></td><td className="c-full" data-label="Para qué">{c.purpose}</td><td data-label="Quién">{c.who}</td><td data-label="Tipo">{c.type}</td><td className="c-full" data-label="Duración">{c.duration}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Datos guardados en su navegador</h2>
      <p>Además de las cookies, el panel guarda en su navegador dos preferencias pequeñas, que nunca salen de él:</p>
      <div className="tbl cardify">
        <table>
          <thead>
            <tr><th>Qué</th><th>Para qué</th><th>Duración</th></tr>
          </thead>
          <tbody>
            {STORAGE.map((s) => (
              <tr key={s.name}><td className="c-title">{s.name}</td><td className="c-full" data-label="Para qué">{s.purpose}</td><td className="c-full" data-label="Duración">{s.duration}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Terceros</h2>
      <ul>
        <li>
          <b>Inscripción:</b> la página de inscripción usa Cloudflare Turnstile para comprobar que quien se inscribe no es un robot. Cloudflare
          procesa su dirección IP y datos técnicos del navegador solo para eso, según su{" "}
          <a href="https://www.cloudflare.com/turnstile-privacy-policy/" target="_blank" rel="noopener noreferrer">política de Turnstile</a>.
        </li>
        <li>
          <b>Pagos:</b> cuando paga la suscripción, la ventana de pago es de Wompi y puede usar sus propias cookies, según su política de privacidad.
        </li>
      </ul>

      <h2>Cómo controlarlas</h2>
      <p>
        Puede borrarlas desde la configuración de su navegador. Si borra <code>access_token</code> o <code>staff_session</code>, se cierra la
        sesión; si borra <code>known_device</code>, le llegará de nuevo el aviso de aparato nuevo; si borra <code>staff_device</code>, el mesero o la
        cocina tendrán que abrir otra vez el enlace que les mandó la dueña.
      </p>

      <h2>Contacto</h2>
      <p>Preguntas: <a href={`mailto:${OWNER.email}`}>{OWNER.email}</a>.</p>
    </LegalPage>
  )
}
