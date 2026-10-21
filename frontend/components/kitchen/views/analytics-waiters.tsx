"use client"

import { fmtN, money } from "@/lib/kitchen/format"
import type { WaiterStat } from "@/lib/kitchen/types"
import { Empty } from "../shared"

// Cuántas mesas atiende cada mesero en un día de trabajo (Julieth, 2026-10-20). Solo en el panel de la dueña:
// los meseros no la ven.
export function WaiterCard({ waiters }: { waiters: WaiterStat[] }) {
  const top = waiters[0]
  return (
    <div className="card">
      <h2>¿Cuántas mesas atiende cada mesero?</h2>
      <p className="small muted">Por día de trabajo, últimas 4 semanas.</p>
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
