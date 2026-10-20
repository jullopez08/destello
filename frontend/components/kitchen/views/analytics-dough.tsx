"use client"

import { byId, useKitchen } from "@/lib/kitchen/store"
import { addDays } from "@/lib/kitchen/rules"
import { batchExpired } from "@/lib/kitchen/batches"
import { doughInsights, lotState, presentationsWithRecipe } from "@/lib/kitchen/lots"
import { grams, money } from "@/lib/kitchen/format"
import type { Seller } from "@/lib/kitchen/analytics"
import { Empty } from "../shared"

const batches = (n: number) => `${String(n).replace(".", ",")} ${n === 1 ? "tanda" : "tandas"}`

// ── Analítica de la masa: gráficas primero, texto solo lo necesario ──
// Orden de lectura (Julieth, 2026-10-16): la cifra que importa, la gráfica y lo demás al final.
// `least` son las cosas que casi no se venden (las mismas de «¿Qué casi no se vende?»).

export function DoughCards({ least }: { least: Seller[] }) {
  const { data, rules } = useKitchen()
  const list = doughInsights(data, rules)
  // Lo botado en 8 semanas: masa (por receta) e insumos vencidos o dañados, en la misma gráfica.
  const since = addDays(data.today, -55)
  const bySupply = new Map<string, number>()
  for (const w of data.supplyWaste) if (w.date >= since) bySupply.set(w.supplyId, (bySupply.get(w.supplyId) ?? 0) + w.cost)
  const wasted = [
    ...list.filter((x) => x.wastedGrams > 0).map((x) => ({ key: `r-${x.recipeId}`, name: x.name, cost: x.wastedCost })),
    ...[...bySupply].map(([id, cost]) => ({ key: `s-${id}`, name: byId(data.supplies, id)?.name ?? "Insumo", cost })),
  ].sort((a, b) => b.cost - a.cost)
  const maxCost = Math.max(1, ...wasted.map((x) => x.cost))
  const totalCost = wasted.reduce((a, x) => a + x.cost, 0)
  const pending =
    data.lots.filter((l) => l.left > 0 && lotState(l, data.today).expired).length + data.supplyBatches.filter((b) => b.left > 0 && batchExpired(b, data.today)).length
  const lowIds = new Set(least.map((s) => s.id))
  const plan = list.filter((x) => x.perDay > 0 || x.wastedGrams > 0)
  const maxGrams = Math.max(1, ...plan.map((x) => x.suggestedGrams))

  return (
    <>
      <div className="card">
        <h2>Lo que se botó</h2>
        {wasted.length ? (
          <>
            <div className="kpi">
              <span className="v num">{money(totalCost)}</span>
              <span className="s">en masa e insumos, últimas 8 semanas</span>
            </div>
            <div className="hbars" role="list" aria-label="Lo que se botó" style={{ marginTop: 14 }}>
              {wasted.map((x) => (
                <div className="hbar" role="listitem" key={x.key}>
                  <span className="t">{x.name}</span>
                  <span className="n">{money(x.cost)}</span>
                  <div className="bar"><span style={{ width: `${(x.cost / maxCost) * 100}%` }} /></div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <Empty>No has botado nada en 8 semanas.</Empty>
        )}
        {pending ? (
          <a className="chip bad dough-pending" href="#hoy">
            {pending} {pending === 1 ? "cosa vencida" : "cosas vencidas"} por botar ›
          </a>
        ) : null}
      </div>

      <div className="card">
        <h2>Masa por lote</h2>
        <p className="small muted">Cuánta preparar, según lo pedido en 4 semanas.</p>
        {plan.length ? (
          <div className="hbars" role="list" aria-label="Masa sugerida por lote" style={{ marginTop: 12 }}>
            {plan.map((x) => {
              const slow = x.wastedGrams > 0 && presentationsWithRecipe(data, x.recipeId).some((id) => lowIds.has(id))
              return (
                <div className="hbar" role="listitem" key={x.recipeId}>
                  <span className="t">{x.name}</span>
                  <span className="n">{x.perDay > 0 ? batches(x.suggestedBatches) : "Sobre pedido"}</span>
                  <div className="bar"><span style={{ width: `${(x.suggestedGrams / maxGrams) * 100}%` }} /></div>
                  <span className="small muted dough-sub">
                    {x.perDay > 0 ? `${grams(x.suggestedGrams)} · dura ${x.shelfDays} ${x.shelfDays === 1 ? "día" : "días"}` : "Sin pedidos en 4 semanas"}
                    {slow ? <span className="chip warn">Se vende poco: haz menos</span> : null}
                  </span>
                </div>
              )
            })}
          </div>
        ) : (
          <Empty>Aquí verás cuánta masa preparar cuando tengas pedidos de productos por lote.</Empty>
        )}
      </div>
    </>
  )
}
