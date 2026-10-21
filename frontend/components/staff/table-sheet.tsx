"use client"

import { useRef, useState } from "react"
import { api, errorMessage } from "@/lib/api"
import { money } from "@/lib/kitchen/format"
import { catalogPrice, minutesSince, waitLevel, type CatalogItem, type Floor, type FloorTable, type PayKey } from "@/lib/restaurant"
import { TableBill, type CloseBody } from "./table-bill"
import { StuckTicket } from "./stuck-ticket"

type Draft = { key: number; item: CatalogItem; productId?: string; sizeId?: string; qty: number; note: string }

const STATUS = { SENT: "En cocina", READY: "Listo", SERVED: "Servido", CANCELLED: "Anulada" } as const

// Una mesa: abrirla, ver sus comandas con su reloj, armar la siguiente para enviarla a cocina, pedir la cuenta y cobrarla.
export function TableSheet({ table, catalog, payKeys, taxRate, cashier, now, normalMin, maxMin, onFloor, onBack }: { table: FloorTable; catalog: CatalogItem[]; payKeys: PayKey[]; taxRate: number; cashier: boolean; now: number; normalMin: number; maxMin: number; onFloor: (f: Floor) => void; onBack: () => void }) {
  const [draft, setDraft] = useState<Draft[]>([])
  const nextKey = useRef(0)
  const [pick, setPick] = useState<{ itemId: string; productId: string; sizeId: string; qty: number; note: string }>({ itemId: "", productId: "", sizeId: "", qty: 1, note: "" })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const s = table.session
  // Sus mesas las cobra él; el encargado de caja cobra cualquiera.
  const charges = !!s && (s.mine || cashier)
  const item = catalog.find((c) => c.id === pick.itemId)

  async function run(action: () => Promise<Floor>) {
    setBusy(true)
    setError(null)
    try {
      onFloor(await action())
      return true
    } catch (err) {
      setError(errorMessage(err))
      return false
    } finally {
      setBusy(false)
    }
  }

  function add() {
    if (!item) return setError("Elige qué piden.")
    if (item.kind !== "BOX" && !pick.productId) return setError("Elige el sabor.")
    if (item.kind === "SIZES" && !pick.sizeId) return setError("Elige el tamaño.")
    setError(null)
    setDraft([...draft, { key: ++nextKey.current, item, productId: pick.productId || undefined, sizeId: pick.sizeId || undefined, qty: pick.qty, note: pick.note.trim() }])
    setPick({ itemId: "", productId: "", sizeId: "", qty: 1, note: "" })
  }

  const send = () =>
    run(() =>
      api<Floor>(`/staff/floor/sessions/${s!.id}/tickets`, {
        method: "POST",
        body: { lines: draft.map((d) => ({ presentationId: d.item.id, productId: d.productId, sizeId: d.sizeId, qty: d.qty, ...(d.note ? { note: d.note } : {}) })) },
      }),
    ).then((ok) => ok && setDraft([]))

  // Cobrada (o liberada sin consumo): vuelve al mapa, donde ya sale libre.
  const close = (body: CloseBody) =>
    run(() => api<Floor>(`/staff/floor/sessions/${s!.id}/close`, { method: "POST", body })).then((ok) => ok && onBack())

  return (
    <main className="floor">
      <header className="floor-head">
        <button type="button" className="btn ghost sm" onClick={onBack}>‹ Mesas</button>
        <h2>{table.name}</h2>
        <span className="num">{s ? money(s.total) : ""}</span>
      </header>
      {error ? <div className="err" role="alert">{error}</div> : null}
      {!s ? (
        <button type="button" className="btn primary" disabled={busy} onClick={() => run(() => api<Floor>(`/staff/floor/tables/${table.id}/open`, { method: "POST" }))}>
          Abrir mesa
        </button>
      ) : null}
      {s && !s.mine ? <p className="small muted">La atiende {s.waiter ?? "la dueña"}.</p> : null}
      {s?.tickets.map((k) => {
        const mins = minutesSince(k.sentAt, now)
        const level = k.status === "SENT" ? waitLevel(mins, normalMin, maxMin) : "ok"
        return (
          <section key={k.id} className={`card ticket ${level}`}>
            <div className="row between nowrap">
              <b>Comanda {k.number}</b>
              <span className="chip">{STATUS[k.status]}{k.status === "SENT" ? ` · ${mins} min` : ""}</span>
            </div>
            {k.lines.map((l, i) => (
              <div key={i} className="small">
                {l.qty} × {l.name}
                {l.note ? <i> — {l.note}</i> : null}
              </div>
            ))}
            {level === "late" ? <p className="small ticket-tip">Lleva {mins} minutos. Acércate a la mesa, discúlpate por la espera y revisa en cocina.</p> : null}
            {k.status === "SENT" && cashier && (s.billAt || level === "late") ? (
              <StuckTicket
                number={k.number}
                busy={busy}
                onOut={() => run(() => api<Floor>(`/staff/floor/tickets/${k.id}/out`, { method: "POST" }))}
                onCancel={() => run(() => api<Floor>(`/staff/floor/tickets/${k.id}/cancel`, { method: "POST" }))}
              />
            ) : null}
            {k.status === "READY" && s.mine ? (
              <button type="button" className="btn primary sm" disabled={busy} onClick={() => run(() => api<Floor>(`/staff/floor/tickets/${k.id}/served`, { method: "POST" }))}>
                Servido
              </button>
            ) : null}
          </section>
        )
      })}
      {s && charges && s.tickets.length > 0 && !s.billAt ? (
        <button type="button" className="btn soft" disabled={busy} onClick={() => run(() => api<Floor>(`/staff/floor/sessions/${s.id}/bill`, { method: "POST" }))}>
          Pedir la cuenta
        </button>
      ) : null}
      {s && charges && s.billAt ? <TableBill session={s} payKeys={payKeys} taxRate={taxRate} busy={busy} onClose={close} /> : null}
      {s && (s.mine || cashier) && !s.tickets.length ? (
        <button type="button" className="linkbtn" disabled={busy} onClick={() => close({ tip: false, payments: [] })}>
          Liberar la mesa (no pidieron nada)
        </button>
      ) : null}
      {s?.mine ? (
        <section className="card stack">
          <b>{s.billAt ? "¿Piden algo más?" : "Nueva comanda"}</b>
          <select value={pick.itemId} onChange={(e) => setPick({ ...pick, itemId: e.target.value, productId: "", sizeId: "" })} aria-label="Qué piden">
            <option value="">¿Qué piden?</option>
            {catalog.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {item && item.kind !== "BOX" ? (
            <select value={pick.productId} onChange={(e) => setPick({ ...pick, productId: e.target.value })} aria-label="Sabor">
              <option value="">Sabor</option>
              {item.items.map((i) => <option key={i.productId} value={i.productId}>{i.name}{i.surcharge ? ` (+${money(i.surcharge)})` : ""}</option>)}
            </select>
          ) : null}
          {item?.kind === "SIZES" ? (
            <select value={pick.sizeId} onChange={(e) => setPick({ ...pick, sizeId: e.target.value })} aria-label="Tamaño">
              <option value="">Tamaño</option>
              {item.sizes.map((z) => <option key={z.id} value={z.id}>{z.name} · {money(z.price)}</option>)}
            </select>
          ) : null}
          <div className="row nowrap">
            <button type="button" className="btn ghost sm" aria-label="Uno menos" onClick={() => setPick({ ...pick, qty: Math.max(1, pick.qty - 1) })}>−</button>
            <b className="num">{pick.qty}</b>
            <button type="button" className="btn ghost sm" aria-label="Uno más" onClick={() => setPick({ ...pick, qty: Math.min(99, pick.qty + 1) })}>+</button>
            <input value={pick.note} onChange={(e) => setPick({ ...pick, note: e.target.value })} maxLength={120} placeholder="Nota: sin cebolla…" aria-label="Nota para la cocina" />
          </div>
          <button type="button" className="btn soft" onClick={add}>Agregar</button>
          {draft.map((d) => (
            <div key={d.key} className="row between nowrap small">
              <span>
                {d.qty} × {d.item.name}
                {d.note ? <i> — {d.note}</i> : null}
              </span>
              <span className="num">{money(d.qty * catalogPrice(d.item, d.productId, d.sizeId))}</span>
              <button type="button" className="linkbtn" onClick={() => setDraft(draft.filter((x) => x.key !== d.key))}>Quitar</button>
            </div>
          ))}
          <button type="button" className="btn primary" disabled={busy || !draft.length} onClick={send}>
            {busy ? "Enviando…" : "Enviar a cocina"}
          </button>
        </section>
      ) : null}
    </main>
  )
}
