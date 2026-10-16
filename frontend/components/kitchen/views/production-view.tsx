"use client"

import { Cookie } from "@/components/ui/cookie"
import { byId, pendingFor, planFor, useKitchen } from "@/lib/kitchen/store"
import { addDays } from "@/lib/kitchen/rules"
import { dateLabel, fmtN, grams, longDate, qty } from "@/lib/kitchen/format"
import { Empty, Kpi, PageHead, Tabs } from "../shared"
import { ProductionChecklist } from "./production-checklist"

// ── Producción del día ──

export function ProductionView({ day, setDay }: { day: string | null; setDay: (d: string) => void }) {
  const { data, rules, act } = useKitchen()
  const today = data.today
  const days = [today, addDays(today, 1)]
  const current = day && days.includes(day) ? day : today
  const orders = data.orders.filter((o) => o.productionDate === current && o.status !== "CANCELLED")
  const pend = pendingFor(data, current)
  const plan = planFor(rules, pend)
  const seen = data.checks[current] ?? {}
  const boxes = Object.entries(plan.boxes)
  const register = () => act(`/production/${current}/register`, "POST", undefined, `Producción registrada. ${pend.length} pedidos listos para enviar`)

  return (
    <>
      <PageHead title="Producción del día" sub="Calculada con los pedidos tomados hasta la hora de corte. Primero se usa la masa de los lotes y lo que falta se hace con insumos.">
        {pend.length ? (
          <button className="btn primary only-desktop" onClick={register}>
            Registrar producción terminada
          </button>
        ) : null}
      </PageHead>
      <Tabs value={current} onChange={setDay} options={days.map((d) => [d, `${dateLabel(d, today)} · ${longDate(d)}`] as [string, string])} />
      {!pend.length ? (
        <Empty>{orders.length ? "La producción de este día ya está registrada. Los pedidos están listos para enviar." : "Todavía no hay pedidos para este día."}</Empty>
      ) : (
        <>
          <div className="only-mobile">
            <ProductionChecklist day={current} plan={plan} orders={pend.length} />
            {plan.shortages.length ? (
              <div className="callout c-strawberry" style={{ marginTop: 14 }}>
                <b>No alcanza:</b> {plan.shortages.map((x) => byId(data.supplies, x.supplyId)?.name).join(", ")}. Registra una compra antes de producir.
              </div>
            ) : null}
            <button className="btn primary block" style={{ marginTop: 16 }} onClick={register}>
              Registrar producción terminada
            </button>
          </div>
          <div className="only-desktop">
            <div className="grid g4">
              <Kpi v={pend.length} l="Pedidos" s="por producir" c="c-accent" href="#pedidos" />
              <Kpi v={boxes.reduce((a, b) => a + b[1], 0)} l="Cajas" s="por armar" c="c-lilac" />
              <Kpi v={Object.values(plan.units).reduce((a, b) => a + b, 0)} l="Unidades" s="galletas, rollos y panes" c="c-strawberry" />
              <Kpi v={grams(plan.doughRows.reduce((a, d) => a + d.toMake, 0))} l="Masa por hacer" s="sin contar lotes" c="c-peach" />
            </div>
            <div className="grid g2" style={{ marginTop: 16 }}>
              <div className="card">
                <h2>Masa</h2>
                <div className="list">
                  {plan.doughRows.map((d) => (
                    <div className="it" key={d.recipeId}>
                      <div>
                        <b>{byId(data.recipes, d.recipeId)?.name}</b>
                        <div className="small muted">
                          Necesitas {grams(d.need)}
                          {d.fromLots ? ` · ${grams(d.fromLots)} del lote` : ""}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        {d.toMake > 0 ? (
                          <>
                            <span className="chip warn">Hacer {grams(d.toMake)}</span>
                            <div className="small muted num">{fmtN(d.batches, 2)} tandas</div>
                          </>
                        ) : (
                          <span className="chip ok">Alcanza el lote</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="card">
                <h2>Lista para armar</h2>
                <div>
                  {boxes.map(([id, n]) => {
                    const key = "b-" + id
                    const done = !!seen[key]
                    return (
                      <label className={`check${done ? " done" : ""}`} key={id}>
                        <input type="checkbox" checked={done} onChange={(e) => act(`/production/${current}/checks`, "PUT", { key, done: e.target.checked })} />
                        <span>
                          <b className="num">{n} ×</b> {byId(data.presentations, id)?.name}
                        </span>
                      </label>
                    )
                  })}
                </div>
              </div>
              <div className="card">
                <h2>Unidades a hornear</h2>
                <div className="list">
                  {Object.entries(plan.units).map(([id, n]) => {
                    const p = byId(data.products, id)!
                    return (
                      <div className="it" key={id}>
                        <div className="row">
                          <Cookie look={p.look} size={34} />
                          <b>{p.name}</b>
                        </div>
                        <span className="num">
                          <b>{n}</b> und · {grams(plan.unitGrams[id] ?? n * p.grams)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
              <div className="card">
                <h2>Insumos que se usan</h2>
                {plan.shortages.length ? (
                  <div className="callout c-strawberry" style={{ marginBottom: 10 }}>
                    <b>No alcanza:</b> {plan.shortages.map((x) => byId(data.supplies, x.supplyId)?.name).join(", ")}. Registra una compra antes de producir.
                  </div>
                ) : (
                  <div className="callout c-sky" style={{ marginBottom: 10 }}>Hay insumos suficientes para toda la producción.</div>
                )}
                <div className="list">
                  {[...plan.supplies].sort((a, b) => b.short - a.short).map((x) => {
                    const s = byId(data.supplies, x.supplyId)!
                    return (
                      <div className="it" key={x.supplyId}>
                        <span>{s.name}</span>
                        <span className="num small">
                          {qty(x.need, s.kind)} de {qty(s.stock, s.kind)} {x.short > 0 ? <span className="chip bad">falta {qty(x.short, s.kind)}</span> : null}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
