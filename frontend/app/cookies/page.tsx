import type { Metadata } from "next"
import { LegalPage, OWNER } from "@/components/legal/legal-page"

export const metadata: Metadata = {
  title: "Política de cookies · Destello",
}

// Debe coincidir con lo que la app guarda de verdad (backend: session-cookie.util.ts y login-alert.service.ts).
const COOKIES = [
  { name: "access_token", purpose: "Mantener su sesión abierta. El navegador no deja que la lea ningún otro sitio ni script.", duration: "Hasta que vence la sesión (1 día) o hasta que sale", type: "Necesaria" },
  { name: "known_device", purpose: "Recordar que este navegador ya entró a su cuenta, para no enviarle el aviso de dispositivo nuevo cada vez.", duration: "1 año", type: "Seguridad" },
]

export default function CookiesPage() {
  return (
    <LegalPage title="Política de cookies">
      <p>Destello usa solo las cookies necesarias para funcionar y mantener su cuenta segura. No usamos cookies de publicidad ni de analítica de terceros.</p>

      <h2>Cookies que usamos</h2>
      <div className="tbl">
        <table>
          <thead>
            <tr><th>Nombre</th><th>Para qué</th><th>Duración</th><th>Tipo</th></tr>
          </thead>
          <tbody>
            {COOKIES.map((c) => (
              <tr key={c.name}><td><code>{c.name}</code></td><td>{c.purpose}</td><td>{c.duration}</td><td>{c.type}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Pagos</h2>
      <p>Cuando paga la suscripción, la ventana de pago es de Wompi y puede usar sus propias cookies, según su política de privacidad.</p>

      <h2>Cómo controlarlas</h2>
      <p>Puede borrarlas desde la configuración de su navegador. Si borra <code>access_token</code>, se cierra su sesión; si borra <code>known_device</code>, le llegará de nuevo el aviso de dispositivo nuevo la próxima vez que entre.</p>

      <h2>Contacto</h2>
      <p>Preguntas: <a href={`mailto:${OWNER.email}`}>{OWNER.email}</a>.</p>
    </LegalPage>
  )
}
