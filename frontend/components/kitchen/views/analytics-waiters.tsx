"use client"

import { fmtN, money } from "@/lib/kitchen/format"
import type { WaiterStat } from "@/lib/kitchen/types"
import { Empty } from "../shared"

// Cuántas mesas atiende cada mesero en un día de trabajo (Julieth, 2026-10-20). Solo en el panel de la dueña:
// los meseros no la ven. Con bastantes días de trabajo sale "lo normal" del negocio: todas las mesas entre todos
// los días trabajados, y se marca a quien atiende bastante menos (Julieth, 2026-10-20).
const NORMAL_MIN_DAYS = 10
const BELOW = 0.8

export function WaiterCard({ waiters }: { waiters: WaiterStat[] }) {
  const top = waiters[0]
  const days = waiters.reduce((a, w) => a + w.days, 0)
  const normal = days >= NORMAL_MIN_DAYS ? Math.round((waiters.reduce((a, w) => a + w.tables, 0) / days) * 10) / 10 : null
  return (
    <div className="card">
      <h2>¿Cuántas mesas atiende cada mesero?</h2>
      <p className="small muted">Por día de trabajo, últimas 4 semanas.</p>
      {normal !== null ? (
        <div className="callout c-sky">
          Lo normal en tu negocio: <b className="num">{fmtN(normal, 1)} mesas al día</b> por mesero.
        </div>
      ) : waiters.length ? (
        <p className="small muted">Con {NORMAL_MIN_DAYS} días de trabajo entre todos te digo cuánto es lo normal (van {days}).</p>
      ) : null}
      {waiters.length ? (
        <div className="list">
          {waiters.map((w) => (
            <div className="it" key={w.id}>
              <div>
                <b>{w.name}</b>
                <div className="small muted">
                  {w.tables} {w.tables === 1 ? "mesa" : "mesas"} en {w.days} {w.days === 1 ? "día" : "días"} · cada mesa consume {money(w.avgSale)}
                  {w.tips ? ` · propinas ${money(w.tips)}` : ""}
                </div>
                {normal !== null && w.perDay < normal * BELOW ? <span className="chip warn">Menos de lo normal</span> : null}
              </div>
              <b className="num" style={{ whiteSpace: "nowrap" }}>{fmtN(w.perDay, 1)} al día</b>
            </div>
          ))}
        </div>
      ) : (
        <Empty>Aún no hay mesas cobradas.</Empty>
      )}
      {waiters.length > 1 ? (
        <p className="conclusion">
          <b>{top.name}</b> es quien más mesas atiende: {fmtN(top.perDay, 1)} al día.
        </p>
      ) : null}
    </div>
  )
}
