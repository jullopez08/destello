"use client"

import { useState } from "react"
import Link from "next/link"
import { Cookie } from "@/components/ui/cookie"
import { PasswordInput } from "@/components/ui/password-input"
import { api, errorMessage } from "@/lib/api"

export function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("")
  const [repeat, setRepeat] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 8) return setError("La contraseña debe tener al menos 8 caracteres.")
    if (password !== repeat) return setError("Las contraseñas no coinciden.")
    setBusy(true)
    try {
      await api("/auth/reset-password", { method: "POST", body: { token, newPassword: password } })
      setDone(true)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login">
      <section className="art">
        <div>
          <div className="eyebrow" style={{ color: "inherit", opacity: 0.7 }}>Panel de la cocina</div>
          <h1 style={{ marginTop: 10 }}><Link href="/" className="home-link" title="Ir a la página de Destello">Destello</Link></h1>
          <p>Crea una contraseña nueva. Al guardarla se cierran todas las sesiones abiertas de tu cuenta.</p>
        </div>
        <div className="plate" aria-hidden="true">
          <Cookie />
          <Cookie look="star" />
        </div>
      </section>
      <section className="form">
        {done ? (
          <div style={{ width: "min(380px, 100%)" }} className="stack">
            <h2>Listo</h2>
            <p className="muted">Tu contraseña quedó cambiada. Ya puedes entrar con ella.</p>
            <Link className="btn primary" href="/access">Entrar</Link>
          </div>
        ) : (
          <form onSubmit={submit} noValidate>
            <h2>Nueva contraseña</h2>
            <label className="f">
              Contraseña nueva
              <PasswordInput autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </label>
            <label className="f">
              Repítela
              <PasswordInput autoComplete="new-password" value={repeat} onChange={(e) => setRepeat(e.target.value)} required />
            </label>
            {error ? <div className="err" role="alert">{error}</div> : null}
            <button className="btn primary" type="submit" disabled={busy}>{busy ? "Guardando…" : "Guardar contraseña"}</button>
            <Link href="/access" className="linkbtn">Volver a entrar</Link>
          </form>
        )}
      </section>
    </div>
  )
}
