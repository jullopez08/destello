"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Art } from "./access-art"
import { PasswordInput } from "@/components/ui/password-input"
import { ToastProvider } from "@/components/ui/toast"
import { api, ApiError, errorMessage } from "@/lib/api"
import { isSuperAdmin, SessionProvider, useSession } from "@/lib/session"
import { KitchenApp } from "@/components/kitchen/kitchen-app"
import { SuperAdminApp } from "@/components/super-admin/super-admin-app"
import { contactHref } from "@/lib/contact"

export function AccessScreen() {
  return (
    <SessionProvider>
      <ToastProvider>
        <Router />
      </ToastProvider>
    </SessionProvider>
  )
}

function Router() {
  const { status, user, needsTerms } = useSession()
  if (status === "loading") return <div className="login"><Art /><div className="form"><p className="muted">Cargando…</p></div></div>
  if (!user) return <LoginScreen />
  if (needsTerms) return <TermsScreen />
  if (user.approvalPending) return <PendingScreen />
  if (user.rejected) return <RejectedScreen />
  return isSuperAdmin(user) ? <SuperAdminApp /> : <KitchenApp />
}

function LoginScreen() {
  const { login, expired } = useSession()
  const [mode, setMode] = useState<"login" | "forgot" | "sent">("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      if (mode === "login") {
        await login(email.trim(), password)
        window.location.hash = ""
      } else {
        await api("/auth/forgot-password", { method: "POST", body: { email: email.trim() } })
        setMode("sent")
      }
    } catch (err) {
      // 401 al entrar: un mensaje claro en vez de "Credenciales incorrectas".
      setError(err instanceof ApiError && err.status === 401 && mode === "login" ? "El correo o la contraseña no coinciden. Revísalos e intenta de nuevo." : errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login">
      <Art />
      <section className="form">
        {mode === "sent" ? (
          <form onSubmit={(e) => { e.preventDefault(); setMode("login") }}>
            <h2>Revisa tu correo</h2>
            <p className="muted">Si {email} tiene una cuenta, te llegó un link para crear una contraseña nueva. Vence en 1 hora.</p>
            <button className="btn primary" type="submit">Volver a entrar</button>
          </form>
        ) : (
          <form onSubmit={submit} noValidate>
            <h2>{mode === "login" ? "Entrar" : "Recuperar contraseña"}</h2>
            {expired && mode === "login" ? <div className="callout c-peach small">Tu sesión se cerró. Entra de nuevo.</div> : null}
            <p className="muted">{mode === "login" ? "Con el correo y la contraseña de tu negocio." : "Te enviamos un link a tu correo para crear una contraseña nueva."}</p>
            <label className="f">
              Correo
              <input type="email" inputMode="email" autoComplete="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint={mode === "login" ? "next" : "send"} placeholder="tu@correo.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            {mode === "login" ? (
              <label className="f">
                Contraseña
                <PasswordInput autoComplete="current-password" enterKeyHint="go" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </label>
            ) : null}
            {error ? <div className="err" role="alert">{error}</div> : null}
            <button className="btn primary" type="submit" disabled={busy || !email || (mode === "login" && !password)}>
              {busy ? "Un momento…" : mode === "login" ? "Entrar al panel" : "Enviar link"}
            </button>
            <button type="button" className="linkbtn" onClick={() => { setError(null); setMode(mode === "login" ? "forgot" : "login") }}>
              {mode === "login" ? "¿Olvidaste tu contraseña?" : "Volver a entrar"}
            </button>
            <Link href="/registro" className="linkbtn">¿Aún no tienes cuenta? Prueba 15 días gratis</Link>
            {/* Meseros y cocina entran con su PIN, no con correo (Julieth, 2026-10-21): la app instalada abre aquí. */}
            {mode === "login" ? <Link href="/equipo" className="btn soft">¿Eres del equipo? Entra con tu PIN</Link> : null}
            <p className="small muted">
              Al entrar aceptas los <Link href="/terminos">Términos</Link> y la <Link href="/privacidad">Política de privacidad</Link>.
            </p>
          </form>
        )}
      </section>
    </div>
  )
}

const DOCS = [
  ["/terminos", "Términos y condiciones"],
  ["/privacidad", "Política de privacidad"],
  ["/cookies", "Política de cookies"],
  ["/reembolsos", "Política de reembolsos"],
] as const

// Primer ingreso de la dueña: acepta los términos antes de ver el panel.
function TermsScreen() {
  const { user, acceptTerms, logout } = useSession()
  const [checked, setChecked] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  return (
    <div className="login">
      <Art />
      <section className="form">
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            setBusy(true)
            setError(null)
            try {
              await acceptTerms()
            } catch (err) {
              setError(errorMessage(err))
            } finally {
              setBusy(false)
            }
          }}
        >
          <h2>Bienvenida, {user?.name.split(" ")[0]}</h2>
          <p className="muted">Antes de empezar con {user?.organizationName}, lee y acepta los documentos que explican cómo funciona Destello y cómo cuidamos tus datos y los de tus clientes.</p>
          <div className="card doc-links">
            {DOCS.map(([href, name]) => (
              <Link key={href} href={href} target="_blank">
                {name}
                <span aria-hidden="true">›</span>
              </Link>
            ))}
          </div>
          <label className="row small" style={{ gap: 10, flexWrap: "nowrap", alignItems: "flex-start" }}>
            <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} style={{ width: 20, height: 20, accentColor: "var(--accent-deep)", flex: "none", marginTop: 2 }} />
            Leí y acepto los Términos y condiciones y la Política de privacidad, autorizo el tratamiento de mis datos personales como ahí se explica y declaro que tengo la autorización de mis clientes y mi equipo para registrar los suyos.
          </label>
          {error ? <div className="err" role="alert">{error}</div> : null}
          <button className="btn primary" type="submit" disabled={!checked || busy}>{busy ? "Guardando…" : "Aceptar y entrar"}</button>
          <button type="button" className="linkbtn" onClick={logout}>Salir</button>
        </form>
      </section>
    </div>
  )
}

// Inscrita por la página con SIGNUP_MODE=review: espera la aprobación. Revisa sola cada 30 s y, al aprobarla,
// entra a la cocina sin recargar; además le llega un correo (OrganizationsService.approve).
const PENDING_CHECK_MS = 30000

function PendingScreen() {
  const { user, logout, setUser } = useSession()
  useEffect(() => {
    const check = () =>
      api<{ user: { approvalPending?: boolean } }>("/auth/me")
        .then((me) => { if (!me.user.approvalPending) setUser((u) => ({ ...u, approvalPending: false })) })
        .catch(() => {})
    const timer = window.setInterval(check, PENDING_CHECK_MS)
    return () => window.clearInterval(timer)
  }, [setUser])
  return (
    <div className="login">
      <Art />
      <section className="form">
        <form onSubmit={(e) => { e.preventDefault(); window.location.reload() }}>
          <h2>Estamos revisando tu negocio</h2>
          <p className="muted">Ya creaste la cuenta de {user?.organizationName}. En cuanto la aprobemos, esta pantalla te lleva a tu cocina y te avisamos por correo.</p>
          <button className="btn primary" type="submit">Revisar de nuevo</button>
          <button type="button" className="linkbtn" onClick={logout}>Salir</button>
        </form>
      </section>
    </div>
  )
}

// El super admin revisó su Instagram o Maps y la carta y no pudo comprobar que el negocio es real.
// Sus datos siguen guardados: al verificarla, "Revisar de nuevo" la lleva a su cocina.
function RejectedScreen() {
  const { user, logout } = useSession()
  const message = `Hola, soy de ${user?.organizationName ?? "mi negocio"} y quiero que revisen mi cuenta de Destello.`
  return (
    <div className="login">
      <Art />
      <section className="form">
        <form onSubmit={(e) => { e.preventDefault(); window.location.reload() }}>
          <h2>No pudimos comprobar tu negocio</h2>
          <p className="muted">Tu cuenta de {user?.organizationName} está en pausa y tus datos siguen guardados. Escríbenos y la revisamos.</p>
          <a className="btn primary" href={contactHref(message)}>Escribirnos por WhatsApp</a>
          <button className="btn ghost" type="submit">Revisar de nuevo</button>
          <button type="button" className="linkbtn" onClick={logout}>Salir</button>
        </form>
      </section>
    </div>
  )
}
