"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Cookie } from "@/components/ui/cookie"
import { api, ApiError, errorMessage } from "@/lib/api"
import { applyPalette } from "@/lib/palettes"
import { WaiterFloor } from "./waiter-floor"
import { KitchenScreen } from "./kitchen-screen"

interface Profile { name: string; role: "WAITER" | "KITCHEN"; organizationName: string; palette: string | null; servesTables?: boolean }
type State = { kind: "loading" } | { kind: "nodevice"; message: string } | { kind: "pin"; profile: Profile } | { kind: "in"; profile: Profile }

const NO_DEVICE = "Este aparato no está conectado. Abre el enlace que te mandó la dueña."

// Lo que ve un mesero o la pantalla de cocina (/equipo). El aparato ya quedó conectado con su enlace y su PIN:
// cada turno (12 h) se escribe el PIN otra vez, también en la cocina (Julieth, 2026-10-20).
export function StaffApp() {
  const [state, setState] = useState<State>({ kind: "loading" })

  useEffect(() => {
    let alive = true
    const show = (s: State) => {
      if (!alive) return
      if (s.kind === "pin" || s.kind === "in") applyPalette(s.profile.palette)
      setState(s)
    }
    ;(async () => {
      try {
        show({ kind: "in", profile: await api<Profile>("/staff/me") })
      } catch {
        try {
          show({ kind: "pin", profile: await api<Profile>("/staff/device") })
        } catch (err) {
          show({ kind: "nodevice", message: err instanceof ApiError && err.status === 403 ? errorMessage(err) : NO_DEVICE })
        }
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  if (state.kind === "loading") return <Screen><p className="muted">Cargando…</p></Screen>
  if (state.kind === "nodevice") return <Screen><h2>Destello</h2><p className="muted">{state.message}</p></Screen>
  if (state.kind === "pin") return <PinPad profile={state.profile} send={(pin) => api<Profile>("/staff/login", { method: "POST", body: { pin } })} onIn={(profile) => setState({ kind: "in", profile })} />
  const out = () => setState({ kind: "pin", profile: state.profile })
  if (state.profile.role === "WAITER") return <WaiterFloor name={state.profile.name} organizationName={state.profile.organizationName} onOut={out} />
  return <KitchenScreen name={state.profile.name} organizationName={state.profile.organizationName} />
}

// Con mesas, el dibujo es un plato servido; si no, una galleta (Julieth, 2026-10-21).
function Screen({ children, dish = false }: { children: React.ReactNode; dish?: boolean }) {
  return (
    <main className="staff-screen">
      <div className="staff-card card">
        <Cookie look={dish ? "plate" : ""} size={48} />
        {children}
      </div>
    </main>
  )
}

function PinPad({ profile, send, onIn }: { profile: Profile; send: (pin: string) => Promise<Profile>; onIn: (p: Profile) => void }) {
  const [pin, setPin] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function press(d: string) {
    if (busy || pin.length >= 4) return
    const next = pin + d
    setPin(next)
    setError(null)
    if (next.length < 4) return
    setBusy(true)
    try {
      onIn(await send(next))
    } catch (err) {
      setError(errorMessage(err))
      setPin("")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen dish={profile.servesTables}>
      <div className="small muted">{profile.organizationName}</div>
      <h2>Hola, {profile.name}</h2>
      <p className="muted">Escribe tu PIN para empezar el turno.</p>
      <div className="pin-dots" aria-label={`${pin.length} de 4 números`}>
        {[0, 1, 2, 3].map((i) => <span key={i} className={i < pin.length ? "on" : ""} />)}
      </div>
      {error ? <div className="err" role="alert">{error}</div> : null}
      <div className="pin-pad">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"].map((k, i) =>
          k === "" ? <span key={i} /> : (
            <button key={i} type="button" className="btn ghost" disabled={busy} aria-label={k === "⌫" ? "Borrar" : k} onClick={() => (k === "⌫" ? setPin(pin.slice(0, -1)) : press(k))}>
              {k}
            </button>
          ),
        )}
      </div>
    </Screen>
  )
}

// /equipo/[enlace]: el enlace fijo de cada persona (Julieth, 2026-10-20). Saluda, pide el PIN y, si es correcto,
// conecta este navegador y pasa a /equipo. Sirve las veces que haga falta, en cualquier navegador.
export function ClaimDevice({ token }: { token: string }) {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    api<Profile>("/staff/link", { method: "POST", body: { token } })
      .then((p) => {
        applyPalette(p.palette)
        setProfile(p)
      })
      .catch((err) => setError(errorMessage(err)))
  }, [token])
  if (error) return <Screen><h2>Enlace no válido</h2><p className="muted">{error}</p></Screen>
  if (!profile) return <Screen><p className="muted">Cargando…</p></Screen>
  return <PinPad profile={profile} send={(pin) => api<Profile>("/staff/claim", { method: "POST", body: { token, pin } })} onIn={() => router.replace("/equipo")} />
}
