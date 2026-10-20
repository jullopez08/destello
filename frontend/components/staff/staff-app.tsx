"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Cookie } from "@/components/ui/cookie"
import { api, ApiError, errorMessage } from "@/lib/api"
import { applyPalette } from "@/lib/palettes"
import { WaiterFloor } from "./waiter-floor"

interface Profile { name: string; role: "WAITER" | "KITCHEN"; organizationName: string; palette: string | null }
type State = { kind: "loading" } | { kind: "nodevice"; message: string } | { kind: "pin"; profile: Profile } | { kind: "in"; profile: Profile }

const NO_DEVICE = "Este aparato no está conectado. Pídele a la dueña tu enlace."

// Lo que ve un mesero o la pantalla de cocina (/equipo). El aparato ya quedó amarrado con su enlace:
// el mesero escribe su PIN cada turno; la cocina entra sola. Las mesas y los pedidos llegan en el siguiente paso.
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
          const profile = await api<Profile>("/staff/device")
          if (profile.role === "KITCHEN") show({ kind: "in", profile: await api<Profile>("/staff/login", { method: "POST", body: {} }) })
          else show({ kind: "pin", profile })
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
  if (state.kind === "pin") return <PinPad profile={state.profile} onIn={(profile) => setState({ kind: "in", profile })} />
  const out = () => setState({ kind: "pin", profile: state.profile })
  if (state.profile.role === "WAITER") return <WaiterFloor name={state.profile.name} organizationName={state.profile.organizationName} onOut={out} />
  return <StaffHome profile={state.profile} onOut={out} />
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <main className="staff-screen">
      <div className="staff-card card">
        <Cookie size={48} />
        {children}
      </div>
    </main>
  )
}

function PinPad({ profile, onIn }: { profile: Profile; onIn: (p: Profile) => void }) {
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
      onIn(await api<Profile>("/staff/login", { method: "POST", body: { pin: next } }))
    } catch (err) {
      setError(errorMessage(err))
      setPin("")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen>
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

function StaffHome({ profile, onOut }: { profile: Profile; onOut: () => void }) {
  const waiter = profile.role === "WAITER"
  return (
    <Screen>
      <div className="small muted">{profile.organizationName}</div>
      <h2>{waiter ? `Hola, ${profile.name}` : profile.name}</h2>
      <div className="callout c-lilac">
        <b>{waiter ? "Tus mesas" : "Pedidos de la cocina"}</b>
        <p style={{ margin: "4px 0 0" }}>{waiter ? "Muy pronto tomas aquí las comandas de tus mesas." : "Muy pronto llegan aquí los pedidos con su reloj."}</p>
      </div>
      {waiter ? (
        <button type="button" className="btn ghost" onClick={async () => { await api("/staff/logout", { method: "POST" }).catch(() => {}); onOut() }}>
          Cerrar turno
        </button>
      ) : null}
    </Screen>
  )
}

// /equipo/[enlace]: amarra este aparato y pasa a /equipo. El enlace sirve una sola vez (de ahí el ref:
// en desarrollo React corre el efecto dos veces y el segundo intento ya no serviría).
export function ClaimDevice({ token }: { token: string }) {
  const router = useRouter()
  const tried = useRef(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (tried.current) return
    tried.current = true
    api("/staff/claim", { method: "POST", body: { token } })
      .then(() => router.replace("/equipo"))
      .catch((err) => setError(errorMessage(err)))
  }, [token, router])
  return <Screen>{error ? <><h2>Enlace no válido</h2><p className="muted">{error}</p></> : <p className="muted">Conectando este aparato…</p>}</Screen>
}
