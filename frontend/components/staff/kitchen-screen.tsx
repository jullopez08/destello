"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { api, errorMessage } from "@/lib/api"
import { beep } from "@/lib/beep"
import { minutesSince, waitLevel, type KitchenBoard } from "@/lib/restaurant"
import { BackHint } from "./back-hint"

const REFRESH_MS = 8000

// Pantalla de cocina (tablet del negocio): comandas de las mesas, la que más espera primero, con su reloj; y los
// pedidos de hoy (domicilio o recoger). "Listo" descuenta los insumos y le avisa al mesero. Suena al llegar una nueva.
export function KitchenScreen({ name, organizationName }: { name: string; organizationName: string }) {
  const [board, setBoard] = useState<KitchenBoard | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [skew, setSkew] = useState(0)
  const seen = useRef<Set<string> | null>(null)

  const show = useCallback((b: KitchenBoard) => {
    const ids = new Set(b.tickets.filter((t) => t.status === "SENT").map((t) => t.id))
    if (seen.current && [...ids].some((id) => !seen.current!.has(id))) beep("new")
    seen.current = ids
    setSkew(new Date(b.now).getTime() - Date.now())
    setBoard(b)
    setError(null)
  }, [])

  useEffect(() => {
    const load = () => api<KitchenBoard>("/staff/kitchen").then(show).catch((err) => setError(errorMessage(err)))
    load()
    const poll = window.setInterval(load, REFRESH_MS)
    const tick = window.setInterval(() => setNow(Date.now()), 15000)
    return () => {
      window.clearInterval(poll)
      window.clearInterval(tick)
    }
  }, [show])

  async function ready(id: string) {
    setBusy(id)
    try {
      show(await api<KitchenBoard>(`/staff/kitchen/tickets/${id}/ready`, { method: "POST" }))
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  const serverNow = now + skew
  const waiting = board?.tickets.filter((t) => t.status === "SENT") ?? []
  const done = board?.tickets.filter((t) => t.status === "READY") ?? []

  return (
    <main className="kitchen-board">
      <header className="floor-head">
        <div>
          <div className="small muted">{organizationName}</div>
          <h2>{name}</h2>
        </div>
        <span className="chip">{waiting.length} en cocina</span>
      </header>
      {error ? <div className="err" role="alert">{error}</div> : null}
      {!board ? <p className="muted">Cargando…</p> : null}
      {board && !waiting.length && !board.orders.length ? <p className="muted">Nada por preparar. Las comandas nuevas aparecen aquí solas.</p> : null}
      <div className="kitchen-grid">
        {waiting.map((t) => {
          const mins = minutesSince(t.sentAt, serverNow)
          const level = waitLevel(mins, board!.normalMin, board!.maxMin)
          return (
            <section key={t.id} className={`card ticket ${level}`}>
              <div className="row between nowrap">
                <b>{t.table}</b>
                <span className="kitchen-clock num">{mins} min</span>
              </div>
              <div className="small muted">Comanda {t.number}{t.waiter ? ` · ${t.waiter}` : ""}</div>
              {t.lines.map((l, i) => (
                <div key={i} className="kitchen-line">
                  <b className="num">{l.qty}×</b> {l.name}
                  {l.note ? <div className="kitchen-note">{l.note}</div> : null}
                </div>
              ))}
              <button type="button" className="btn primary" disabled={busy === t.id} onClick={() => ready(t.id)}>
                {busy === t.id ? "Marcando…" : "Listo"}
              </button>
            </section>
          )
        })}
      </div>
      {board?.orders.length ? (
        <section className="stack">
          <h3 style={{ margin: 0 }}>Pedidos para hoy</h3>
          <div className="kitchen-grid">
            {board.orders.map((o) => (
              <section key={o.id} className="card ticket">
                <div className="row between nowrap">
                  <b>{o.delivery === "DELIVERY" ? "Domicilio" : "Recoge"}</b>
                  <span className="small muted">#{o.number}</span>
                </div>
                <div className="small muted">{o.customer}</div>
                {o.lines.map((l, i) => <div key={i} className="kitchen-line"><b className="num">{l.qty}×</b> {l.name}</div>)}
              </section>
            ))}
          </div>
          <p className="small muted">Los pedidos se marcan como producidos en Producción, desde el panel.</p>
        </section>
      ) : null}
      {done.length ? <p className="small muted">Listas hace poco: {done.map((t) => `${t.table} (comanda ${t.number})`).join(", ")}.</p> : null}
      <BackHint />
    </main>
  )
}
