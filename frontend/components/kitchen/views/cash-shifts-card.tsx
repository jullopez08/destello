"use client"

import { HelpTip } from "../shared"
import { HELP } from "@/lib/kitchen/help"
import { money } from "@/lib/kitchen/format"
import type { CashShiftDone } from "@/lib/restaurant"

/** Igual que CASH_TOLERANCE en backend/src/restaurant/cash-rules.ts */
const TOLERANCE = 500
const when = (iso: string) => new Date(iso).toLocaleString("es-CO", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })

// Turnos de caja de 30 días (Julieth, 2026-10-21): quién abrió y cerró, la base, lo que debía haber y lo contado. Las
// diferencias quedan "Por revisar" hasta que la dueña las mira, como las comandas anuladas.
export function CashShiftsCard({ list, busy, onReview }: { list: CashShiftDone[]; busy: boolean; onReview: (id: string) => void }) {
  if (!list.length) return null
  const off = list.filter((s) => Math.abs(s.difference) >= TOLERANCE)
  const missing = off.filter((s) => s.difference < 0).reduce((a, s) => a - s.difference, 0)
  return (
    <section className="card stack cash-shifts">
      <h3 style={{ margin: 0 }}>Turnos de caja <HelpTip text={HELP.cashShifts} /></h3>
      <p className="small muted">
        En 30 días: {list.length === 1 ? "1 turno" : `${list.length} turnos`}, {off.length ? `${off.length} con diferencia${missing ? ` (faltaron ${money(missing)} en total)` : ""}` : "todos cuadraron"}.
      </p>
      {list.map((s) => (
        <div key={s.id} className="stack cash-shift">
          <div className="row between nowrap">
            <b>{when(s.openedAt)} → {when(s.closedAt)}</b>
            <span className={`chip ${Math.abs(s.difference) < TOLERANCE ? "good" : s.difference < 0 ? "bad" : "warn"}`}>
              {Math.abs(s.difference) < TOLERANCE ? "Cuadró" : s.difference < 0 ? `Faltaron ${money(-s.difference)}` : `Sobraron ${money(s.difference)}`}
            </span>
          </div>
          <span className="small">Base {money(s.openingCash)} · Debía haber {money(s.expected)} · Contaron {money(s.counted)}</span>
          <span className="small muted">
            Abrió {s.openedBy} · Cerró {s.closedBy}
            {s.firstCount !== null ? ` · Contaron dos veces (primero ${money(s.firstCount)})` : ""}
            {s.moves.length ? ` · ${s.moves.length === 1 ? "1 entrada o salida" : `${s.moves.length} entradas o salidas`}` : ""}
          </span>
          {s.note ? <span className="small">«{s.note}»</span> : null}
          {Math.abs(s.difference) >= TOLERANCE && !s.reviewedAt ? (
            <button type="button" className="btn soft sm" disabled={busy} onClick={() => onReview(s.id)}>Revisado</button>
          ) : null}
        </div>
      ))}
    </section>
  )
}
