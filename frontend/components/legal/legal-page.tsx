import Link from "next/link"
import { Cookie } from "@/components/ui/cookie"

// Datos de la titular (persona natural; no es una empresa).
export const OWNER = {
  name: "Julieth Perdomo López",
  nit: "1010124306-9",
  address: "CR 3 #1A-169 BRR San Vicente, Cartago, Valle del Cauca, Colombia",
  email: "legal@aggendarme.com",
}

// Al cambiar el contenido legal, actualizar esta fecha y CURRENT_TERMS_VERSION (lib/session.tsx).
export const LEGAL_UPDATED = "2026-10-11"

export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="legal">
      <Link href="/access" className="row" style={{ textDecoration: "none", gap: 10 }}>
        <Cookie size={34} />
        <b style={{ fontFamily: "var(--display)", fontSize: 24, fontWeight: 400 }}>Destello</b>
      </Link>
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

export const PROCESSORS = [
  { provider: "Railway (servidores y base de datos)", country: "Estados Unidos", mechanism: "Acuerdo de tratamiento de datos (DPA) con cláusulas contractuales estándar" },
  { provider: "Resend (correos de la cuenta)", country: "Estados Unidos", mechanism: "Acuerdo de tratamiento de datos (DPA) con cláusulas contractuales estándar" },
  { provider: "Cloudinary (logos de los negocios)", country: "Estados Unidos", mechanism: "Acuerdo de tratamiento de datos (DPA) con cláusulas contractuales estándar" },
  { provider: "Wompi (pagos de la suscripción)", country: "Colombia", mechanism: "No hay transferencia internacional" },
]

export function ProcessorsTable() {
  return (
    <div className="tbl">
      <table>
        <thead>
          <tr><th>Tercero</th><th>País</th><th>Garantía</th></tr>
        </thead>
        <tbody>
          {PROCESSORS.map((p) => (
            <tr key={p.provider}><td>{p.provider}</td><td>{p.country}</td><td>{p.mechanism}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
