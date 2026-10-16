"use client"

import { useState } from "react"
import Link from "next/link"
import { Cookie } from "@/components/ui/cookie"
import { PasswordInput } from "@/components/ui/password-input"
import { ToastProvider } from "@/components/ui/toast"
import { api, ApiError, errorMessage } from "@/lib/api"
import { isSuperAdmin, SessionProvider, useSession } from "@/lib/session"
import { KitchenApp } from "@/components/kitchen/kitchen-app"
import { SuperAdminApp } from "@/components/super-admin/super-admin-app"

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
  return isSuperAdmin(user) ? <SuperAdminApp /> : <KitchenApp />
}

function Art() {
  return (
    <section className="art">
      <div>
        <div className="eyebrow" style={{ color: "inherit", opacity: 0.7 }}>Panel de la cocina</div>
        <h1 style={{ marginTop: 10 }}>Destello</h1>
        <p>Pedidos del día, producción, inventario por peso y proveedores. Todo en un solo lugar.</p>
      </div>
      <div className="plate" aria-hidden="true">
        <Cookie />
        <Cookie look="choco" />
        <Cookie look="roll" />
        <Cookie look="bread" />
      </div>
    </section>
  )
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
            Leí y acepto los Términos y condiciones y la Política de privacidad, y autorizo el tratamiento de los datos de mi negocio.
          </label>
          {error ? <div className="err" role="alert">{error}</div> : null}
          <button className="btn primary" type="submit" disabled={!checked || busy}>{busy ? "Guardando…" : "Aceptar y entrar"}</button>
          <button type="button" className="linkbtn" onClick={logout}>Salir</button>
        </form>
      </section>
    </div>
  )
}
