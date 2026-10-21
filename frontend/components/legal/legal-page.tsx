import Link from "next/link"
import { Cookie } from "@/components/ui/cookie"
import { LegalBack } from "./legal-back"

// Datos de la titular (persona natural; no es una empresa). El Decreto 1377 de 2013 (art. 13) pide nombre, domicilio,
// dirección, correo y teléfono del responsable. PENDIENTE (Julieth): el correo es provisional de aggendarme hasta que
// Destello tenga dominio, y falta el teléfono de contacto.
export const OWNER = {
  name: "Julieth Perdomo López",
  nit: "1010124306-9",
  city: "Cartago, Valle del Cauca, Colombia",
  address: "CR 3 #1A-169 BRR San Vicente, Cartago, Valle del Cauca, Colombia",
  email: "legal@aggendarme.com",
  phone: "Por definir",
}

// Al cambiar el contenido legal, actualizar esta fecha y CURRENT_TERMS_VERSION (lib/session.tsx).
export const LEGAL_UPDATED = "2026-10-21"

export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="legal">
      <div className="legal-top">
        <Link href="/" className="row home-link" style={{ textDecoration: "none", gap: 10 }} title="Ir a la página de Destello">
          <Cookie size={34} />
          <b style={{ fontFamily: "var(--display)", fontSize: 24, fontWeight: 400 }}>Destello</b>
        </Link>
        <LegalBack />
      </div>
      <h1>{title}</h1>
      <p className="small muted">
        Última actualización:{" "}
        <time dateTime={LEGAL_UPDATED}>
          {new Date(LEGAL_UPDATED + "T12:00:00").toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })}
        </time>
      </p>
      <div style={{ marginTop: 24 }}>{children}</div>
      <footer className="small muted" style={{ marginTop: 48, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
        <p>© {new Date().getFullYear()} {OWNER.name} · NIT {OWNER.nit}</p>
        <nav className="row" style={{ gap: 14 }} aria-label="Documentos legales">
          <Link href="/terminos">Términos</Link>
          <Link href="/privacidad">Privacidad</Link>
          <Link href="/cookies">Cookies</Link>
          <Link href="/reembolsos">Reembolsos</Link>
          <Link href="/eliminacion-de-datos">Eliminación de datos</Link>
        </nav>
      </footer>
    </div>
  )
}

// Terceros que tratan datos por cuenta de Destello (encargados o subencargados). Si se agrega uno, se avisa con 15 días.
// Estados Unidos figura en la lista de países con nivel adecuado de protección de la SIC (Circular Única, Título V,
// desde la Circular Externa 005 de 2017).
export const PROCESSORS = [
  { provider: "Railway", role: "Servidores y base de datos donde vive toda la información", data: "Todos los datos del servicio", country: "Estados Unidos" },
  { provider: "Resend", role: "Envío de correos (códigos, avisos de la cuenta)", data: "Correo, nombre y el contenido del aviso", country: "Estados Unidos" },
  { provider: "Cloudinary", role: "Guardar el logo del negocio", data: "La imagen del logo", country: "Estados Unidos" },
  { provider: "Cloudflare (Turnstile)", role: "Comprobar que quien se inscribe no es un robot", data: "Dirección IP y datos técnicos del navegador, solo en la inscripción", country: "Estados Unidos" },
  { provider: "Wompi (Bancolombia)", role: "Cobrar la suscripción", data: "Los datos de pago los recibe Wompi; Destello solo guarda el estado, el valor y el número de la transacción", country: "Colombia" },
]

export function ProcessorsTable() {
  return (
    <div className="tbl cardify">
      <table>
        <thead>
          <tr><th>Tercero</th><th>Para qué</th><th>Qué datos</th><th>País</th></tr>
        </thead>
        <tbody>
          {PROCESSORS.map((p) => (
            <tr key={p.provider}><td className="c-title">{p.provider}</td><td className="c-full" data-label="Para qué">{p.role}</td><td className="c-full" data-label="Qué datos">{p.data}</td><td data-label="País">{p.country}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
