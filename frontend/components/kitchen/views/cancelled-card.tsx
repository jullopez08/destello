"use client"

import { useState } from "react"
import { HelpTip } from "../shared"
import { HELP } from "@/lib/kitchen/help"
import { money } from "@/lib/kitchen/format"
import { CANCEL_REASON_LABELS, minutesSince, type CancelledTicket } from "@/lib/restaurant"

const when = (iso: string) => new Date(iso).toLocaleString("es-CO", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })
const waited = (m: number) => (m < 60 ? `${m} min` : m < 1440 ? `${Math.floor(m / 60)} h` : `${Math.floor(m / 1440)} d`)

// Anulaciones de 30 días en Caja (Julieth, 2026-10-21; como los informes de anulaciones de Toast o Aloha): cada una
// con lo que llevaba (no se descontó del inventario), quién, por qué y cuánto llevaba en cocina. La dueña las revisa
// una por una ("Por revisar") y ve cuántas anuló cada persona: anular es una forma conocida de quedarse con lo cobrado.
export function CancelledCard({ list, busy, onReview }: { list: CancelledTicket[]; busy: boolean; onReview: (id: string) => void }) {
  const pending = list.filter((k) => !k.reviewedAt)
  const [tab, setTab] = useState<"pending" | "done">(pending.length ? "pending" : "done")
  const shown = tab === "pending" ? pending : list.filter((k) => k.reviewedAt)
  const byPerson = new Map<string, { count: number; total: number }>()
  for (const k of list) {
    const p = byPerson.get(k.by ?? "—") ?? { count: 0, total: 0 }
    byPerson.set(k.by ?? "—", { count: p.count + 1, total: p.total + k.total })
  }

  return (
    <section className="card stack cancelled-card">
      <h3 style={{ margin: 0 }}>Comandas anuladas <HelpTip text={HELP.cancelledTickets} /></h3>
      <p className="small muted">
        En 30 días: {[...byPerson].map(([name, p]) => `${name} ${p.count} (${money(p.total)})`).join(" · ")}
      </p>
      <div className="seg">
        <label><input type="radio" name="cancelled-tab" checked={tab === "pending"} onChange={() => setTab("pending")} /><span>Por revisar · {pending.length}</span></label>
        <label><input type="radio" name="cancelled-tab" checked={tab === "done"} onChange={() => setTab("done")} /><span>Revisadas</span></label>
      </div>
      {shown.length ? (
        shown.map((k) => (
          <div key={k.id} className="stack cancelled-item">
            <div className="row between nowrap">
              <b>{k.table} · comanda {k.number}</b>
              <b className="num">{money(k.total)}</b>
            </div>
            <span className="small muted">No se cobró ni se descontó del inventario:</span>
            {k.lines.map((l, i) => <div key={i} className="small">{l.qty} × {l.name}</div>)}
            <span className="small muted">
              {k.by ?? "—"} · {k.reason ? CANCEL_REASON_LABELS[k.reason] : "Sin motivo"} · {when(k.at)} · llevaba {waited(minutesSince(k.sentAt, Date.parse(k.at)))} en cocina
            </span>
            {k.reviewedAt ? null : <button type="button" className="btn soft sm" disabled={busy} onClick={() => onReview(k.id)}>Revisada</button>}
          </div>
        ))
      ) : (
        <p className="small muted">{tab === "pending" ? "Nada por revisar." : "Aún no has revisado ninguna."}</p>
      )}
    </section>
  )
}
