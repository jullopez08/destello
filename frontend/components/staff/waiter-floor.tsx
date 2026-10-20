"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { api, errorMessage } from "@/lib/api"
import { minutesSince, oldestWaiting, waitLevel, type Floor } from "@/lib/restaurant"
import { beep } from "@/lib/beep"
import { TableSheet } from "./table-sheet"
import { BackHint } from "./back-hint"

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
  // Comandas suyas que la cocina marcó "Listo": suena y salen arriba hasta que las lleve.
  const [ready, setReady] = useState<{ id: string; table: string; number: number }[]>([])
  const seenReady = useRef<Set<string> | null>(null)

  const show = useCallback((f: Floor) => {
    const mine = f.tables.flatMap((t) => (t.session?.mine ? t.session.tickets.filter((k) => k.status === "READY").map((k) => ({ id: k.id, table: t.name, number: k.number })) : []))
    if (seenReady.current && mine.some((k) => !seenReady.current!.has(k.id))) beep("ready")
    seenReady.current = new Set(mine.map((k) => k.id))
    setReady(mine)
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
  // Comandas suyas que pasaron el tiempo máximo: suena una vez por comanda y salen arriba hasta que la cocina las
  // marque listas (Julieth, 2026-10-19: el aviso de acercarse a la mesa no debe depender de estar mirando).
  const late = (floor?.tables ?? []).flatMap((t) => {
    const k = t.session?.mine ? oldestWaiting(t.session) : null
    const mins = k ? minutesSince(k.sentAt, serverNow) : 0
    return k && floor && waitLevel(mins, floor.normalMin, floor.maxMin) === "late" ? [{ id: k.id, tableId: t.id, table: t.name, mins }] : []
  })
  const warned = useRef<Set<string>>(new Set())
  const lateIds = late.map((k) => k.id).join(",")
  useEffect(() => {
    const fresh = lateIds.split(",").filter((id) => id && !warned.current.has(id))
    if (!fresh.length) return
    fresh.forEach((id) => warned.current.add(id))
    beep("late")
  }, [lateIds])

  const table = floor?.tables.find((t) => t.id === openId)
  if (floor && table) return <TableSheet table={table} catalog={floor.catalog} now={serverNow} normalMin={floor.normalMin} maxMin={floor.maxMin} onFloor={show} onBack={() => setOpenId(null)} />

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
      {late.length ? (
        <div className="callout c-strawberry ready-alert" role="alert">
          {late.map((k) => (
            <button key={k.id} type="button" className="linkbtn" onClick={() => setOpenId(k.tableId)}>
              {k.table} lleva {k.mins} min: acércate, discúlpate por la espera y revisa en cocina ›
            </button>
          ))}
        </div>
      ) : null}
      {ready.length ? (
        <div className="callout c-mint ready-alert" role="status">
          {ready.map((k) => (
            <button key={k.id} type="button" className="linkbtn" onClick={() => setOpenId(floor?.tables.find((t) => t.name === k.table)?.id ?? null)}>
              Lista: {k.table}, comanda {k.number} ›
            </button>
          ))}
        </div>
      ) : null}
      {!floor ? <p className="muted">Cargando…</p> : null}
      {floor && !floor.tables.length ? <p className="muted">Aún no hay mesas. Pídele a la dueña que las cree en Configuración.</p> : null}
      <div className="floor-grid">
        {floor?.tables.map((t) => {
          const s = t.session
          const waiting = oldestWaiting(s)
          const mins = waiting ? minutesSince(waiting.sentAt, serverNow) : 0
          const level = waiting ? waitLevel(mins, floor.normalMin, floor.maxMin) : "ok"
          return (
            <button
              key={t.id}
              type="button"
              className={`table-tile${s ? (s.mine ? " mine" : " other") : ""} ${level}`}
              aria-label={`${t.name}, ${!s ? "libre" : s.mine ? "tuya" : `de ${s.waiter ?? "la dueña"}`}${waiting ? `, en cocina hace ${mins} minutos` : ""}`}
              onClick={() => setOpenId(t.id)}
            >
              <b>{t.name}</b>
              <span className="small">{!s ? "Libre" : s.mine ? "Tuya" : `De ${s.waiter ?? "la dueña"}`}</span>
              {waiting ? <span className="table-clock num">En cocina · {mins} min</span> : null}
              {level === "late" && s?.mine ? <span className="small">Acércate y avísale</span> : null}
            </button>
          )
        })}
      </div>
      <BackHint />
    </main>
  )
}
