"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { PasswordInput } from "@/components/ui/password-input"
import { api, errorMessage } from "@/lib/api"
import { contactHref, TRIAL_MESSAGE } from "@/lib/contact"
import { phoneInput, phoneProblem } from "@/lib/kitchen/format"
import { CURRENT_TERMS_VERSION } from "@/lib/session"
import { Art } from "./access-art"
import { Captcha, CAPTCHA_SITE_KEY } from "./captcha"

const MENU_MAX_MB = 5

// Inscripción por la página (/registro): datos del negocio, código al correo y
// al confirmarlo entra a su cocina con la prueba gratis, sin tarjeta.
export function SignupScreen() {
  const [mode, setMode] = useState<"open" | "review" | "closed" | null>(null)
  const [step, setStep] = useState<"form" | "code">("form")
  const [f, setF] = useState({ ownerName: "", email: "", whatsapp: "", businessName: "", servesTables: false, makesMeals: false, findUs: "", password: "" })
  // La carta del negocio en PDF (Julieth, 2026-10-20): con "¿Dónde te encontramos?" sirve para comprobar que es real.
  const [menu, setMenu] = useState<File | null>(null)
  const [terms, setTerms] = useState(false)
  const [code, setCode] = useState("")
  const [sentAt, setSentAt] = useState(0)
  const [now, setNow] = useState(() => Date.now())
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [captcha, setCaptcha] = useState("")
  const [round, setRound] = useState(0)
  const set = (patch: Partial<typeof f>) => setF((x) => ({ ...x, ...patch }))

  useEffect(() => {
    api<{ mode: "open" | "review" | "closed" }>("/signup/mode").then((r) => setMode(r.mode)).catch(() => setMode("open"))
  }, [])
  useEffect(() => {
    if (step !== "code") return
    const t = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [step])

  async function run(action: () => Promise<void>) {
    setError(null)
    setBusy(true)
    try {
      await action()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const sendCode = () =>
    run(async () => {
      const badPhone = phoneProblem(f.whatsapp)
      if (badPhone) throw new Error(badPhone)
      // La respuesta del captcha sirve una vez: pase lo que pase, se pide otra para el siguiente intento.
      setRound((n) => n + 1)
      const body = new FormData()
      for (const [k, v] of Object.entries({ ...f, email: f.email.trim(), termsVersion: CURRENT_TERMS_VERSION, ...(CAPTCHA_SITE_KEY ? { captcha } : {}) })) body.append(k, String(v))
      if (menu) body.append("menu", menu)
      await api("/signup/start", { method: "POST", body })
      setSentAt(Date.now())
      setNow(Date.now())
      setCode("")
      setStep("code")
    })

  const wait = Math.max(0, 60 - Math.floor((now - sentAt) / 1000))
  const filled = f.ownerName.trim() && f.email.trim() && f.whatsapp.trim() && f.businessName.trim() && f.findUs.trim() && menu && f.password.length >= 8 && terms

  function pickMenu(file: File | undefined) {
    setError(null)
    if (!file) return setMenu(null)
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) return setError("La carta debe ser un archivo PDF.")
    if (file.size > MENU_MAX_MB * 1024 * 1024) return setError(`La carta pesa más de ${MENU_MAX_MB} MB. Guárdala más liviana e intenta de nuevo.`)
    setMenu(file)
  }
  const ready = filled && (!CAPTCHA_SITE_KEY || captcha)

  return (
    <div className="login">
      <Art />
      <section className="form">
        {mode === "closed" ? (
          <div className="signup-closed">
            <h2>Muy pronto</h2>
            <p className="muted">Por ahora abrimos Destello negocio por negocio. Escríbenos y te ayudamos a empezar.</p>
            <a className="btn primary" href={contactHref(TRIAL_MESSAGE)}>Escribir por WhatsApp</a>
            <Link href="/access" className="linkbtn">Ya tengo cuenta</Link>
          </div>
        ) : step === "form" ? (
          <form onSubmit={(e) => { e.preventDefault(); if (ready) sendCode() }} noValidate>
            <h2>Prueba 15 días gratis</h2>
            <p className="muted">Sin tarjeta. Al final de la prueba decides si sigues.</p>
            <label className="f">
              Tu nombre
              <input autoComplete="name" value={f.ownerName} onChange={(e) => set({ ownerName: e.target.value })} required />
            </label>
            <label className="f">
              Nombre del negocio
              <input autoComplete="organization" placeholder="Ej. Pastelería Dulce Hogar" value={f.businessName} onChange={(e) => set({ businessName: e.target.value })} required />
            </label>
            <fieldset className="f signup-type">
              <legend>¿Atiendes clientes en mesas?</legend>
              <div className="seg">
                {([[false, "No"], [true, "Sí"]] as const).map(([value, label]) => (
                  <label key={label}>
                    <input type="radio" name="servesTables" checked={f.servesTables === value} onChange={() => set({ servesTables: value })} />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
              <span className="small muted">
                {f.servesTables ? "Mesas, meseros, caja y pantalla de cocina, además de pedidos y producción." : "Pedidos, domicilios, producción e inventario. Lo puedes cambiar después."}
              </span>
            </fieldset>
            {/* Solo cambia los dibujos: galletas y panes, o platos (Julieth, 2026-10-21). */}
            <fieldset className="f signup-type">
              <legend>¿Qué preparas sobre todo?</legend>
              <div className="seg">
                {([[false, "Postres y panes"], [true, "Comida"]] as const).map(([value, label]) => (
                  <label key={label}>
                    <input type="radio" name="makesMeals" checked={f.makesMeals === value} onChange={() => set({ makesMeals: value })} />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="f">
              ¿Dónde te encontramos?
              <input autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="@tunegocio o enlace de Google Maps" value={f.findUs} onChange={(e) => set({ findUs: e.target.value })} required />
              <span className="h">Tu Instagram o tu negocio en Google Maps: así sabemos que es real.</span>
            </label>
            <label className="f">
              La carta de tu negocio (PDF)
              <input type="file" accept="application/pdf,.pdf" onChange={(e) => pickMenu(e.target.files?.[0])} required />
              <span className="h">{menu ? `${menu.name} · ${Math.max(1, Math.round(menu.size / 1024))} KB` : `Tu menú con precios, en PDF (máximo ${MENU_MAX_MB} MB).`}</span>
            </label>
            <label className="f">
              Correo
              <input type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} placeholder="tu@correo.com" value={f.email} onChange={(e) => set({ email: e.target.value })} required />
            </label>
            <label className="f">
              WhatsApp del negocio
              <input type="tel" inputMode="tel" autoComplete="tel" placeholder="300 000 0000" value={f.whatsapp} onChange={(e) => set({ whatsapp: phoneInput(e.target.value) })} required />
            </label>
            <label className="f">
              Contraseña
              <PasswordInput autoComplete="new-password" placeholder="Mínimo 8 caracteres" value={f.password} onChange={(e) => set({ password: e.target.value })} required />
            </label>
            <label className="row small signup-terms">
              <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} />
              <span>
                Acepto los <Link href="/terminos" target="_blank">Términos</Link> y la <Link href="/privacidad" target="_blank">Política de privacidad</Link>, y autorizo el tratamiento de los datos de mi negocio.
              </span>
            </label>
            {error ? <div className="err" role="alert">{error}</div> : null}
            <button className="btn primary" type="submit" disabled={busy || !ready}>{busy ? "Un momento…" : filled && !ready ? "Comprobando…" : "Crear mi cuenta"}</button>
            <Link href="/access" className="linkbtn">Ya tengo cuenta</Link>
          </form>
        ) : (
          <form onSubmit={(e) => {
            e.preventDefault()
            run(async () => {
              await api("/signup/verify", { method: "POST", body: { email: f.email.trim(), code } })
              window.location.href = "/access#hoy"
            })
          }} noValidate>
            <h2>Revisa tu correo</h2>
            <p className="muted">Te enviamos un código de 6 números a <b>{f.email.trim()}</b>. Vence en 15 minutos.</p>
            <label className="f">
              Código
              <input className="signup-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} autoFocus />
            </label>
            {mode === "review" ? <div className="callout c-lilac small">Después de confirmar, revisamos tu negocio y te avisamos cuando puedas entrar.</div> : null}
            {error ? <div className="err" role="alert">{error}</div> : null}
            <button className="btn primary" type="submit" disabled={busy || code.length !== 6}>{busy ? "Un momento…" : "Confirmar y entrar"}</button>
            <button type="button" className="linkbtn" disabled={busy || wait > 0 || (!!CAPTCHA_SITE_KEY && !captcha)} onClick={sendCode}>
              {wait > 0 ? `Pedir otro código en ${wait} s` : "Pedir otro código"}
            </button>
            <button type="button" className="linkbtn" onClick={() => { setError(null); setStep("form") }}>Cambiar mis datos</button>
          </form>
        )}
        {mode && mode !== "closed" ? <Captcha round={round} onToken={setCaptcha} /> : null}
      </section>
    </div>
  )
}
