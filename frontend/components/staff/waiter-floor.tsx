"use client"

import { useCallback, useEffect, useState } from "react"
import { api, errorMessage } from "@/lib/api"
import { minutesSince, oldestWaiting, waitLevel, type Floor } from "@/lib/restaurant"
import { TableSheet } from "./table-sheet"

const REFRESH_MS = 10000

// El salón del mesero: todas las mesas (libres, suyas o de otro mesero) con el reloj de la comanda que más lleva en
// cocina. Idea de Julieth (2026-10-19): el mesero también ve el tiempo, para acercarse y avisar si una mesa espera
// mucho (las esperas sin explicación se sienten más largas).
export function WaiterFloor({ name, organizationName, onOut }: { name: string; organizationName: string; onOut: () => void }) {
  const [floor, setFloor] = useState<Floor | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [skew, setSkew] = useState(0)

  const show = useCallback((f: Floor) => {
    setSkew(new Date(f.now).getTime() - Date.now())
    setFloor(f)
    setError(null)
  }, [])

  useEffect(() => {
    const load = () => api<Floor>("/staff/floor").then(show).catch((err) => setError(errorMessage(err)))
    load()
    const poll = window.setInterval(load, REFRESH_MS)
    const tick = window.setInterval(() => setNow(Date.now()), 15000)
    return () => {
      window.clearInterval(poll)
      window.clearInterval(tick)
    }
  }, [show])

  const serverNow = now + skew
  const table = floor?.tables.find((t) => t.id === openId)
  if (floor && table) return <TableSheet table={table} catalog={floor.catalog} now={serverNow} onFloor={show} onBack={() => setOpenId(null)} />

  return (
    <main className="floor">
      <header className="floor-head">
        <div>
          <div className="small muted">{organizationName}</div>
          <h2>Hola, {name}</h2>
        </div>
        <button type="button" className="btn ghost sm" onClick={async () => { await api("/staff/logout", { method: "POST" }).catch(() => {}); onOut() }}>
          Cerrar turno
        </button>
      </header>
      {error ? <div className="err" role="alert">{error}</div> : null}
      {!floor ? <p className="muted">Cargando…</p> : null}
      {floor && !floor.tables.length ? <p className="muted">Aún no hay mesas. Pídele a la dueña que las cree en Configuración.</p> : null}
      <div className="floor-grid">
        {floor?.tables.map((t) => {
          const s = t.session
          const waiting = oldestWaiting(s)
          const mins = waiting ? minutesSince(waiting.sentAt, serverNow) : 0
          const level = waiting ? waitLevel(mins) : "ok"
          return (
            <button key={t.id} type="button" className={`table-tile${s ? (s.mine ? " mine" : " other") : ""} ${level}`} onClick={() => setOpenId(t.id)}>
              <b>{t.name}</b>
              <span className="small">{!s ? "Libre" : s.mine ? "Tuya" : `De ${s.waiter ?? "la dueña"}`}</span>
              {waiting ? <span className="table-clock num">En cocina · {mins} min</span> : null}
              {level === "late" && s?.mine ? <span className="small">Acércate y avísale</span> : null}
            </button>
          )
        })}
      </div>
    </main>
  )
}
