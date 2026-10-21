"use client"

import { Cookie } from "@/components/ui/cookie"
import { byId, useKitchen } from "@/lib/kitchen/store"
import { fmtN, grams } from "@/lib/kitchen/format"
import { pluralName } from "@/lib/kitchen/format"
import type { ProductionPlan } from "@/lib/kitchen/rules"

type Item = { key: string; label: string; sub: string; look?: string }

/**
 * Producción en el celular, como el mockup: una lista para marcar con el dedo
 * (masas, hornear, armar cajas) con su barra de avance. Cada casilla se guarda
 * en el servidor (PUT /production/:date/checks), así que sirve en cualquier
 * dispositivo. Las cajas usan la misma clave "b-<id>" que la lista del computador.
 */
export function ProductionChecklist({ day, plan, orders }: { day: string; plan: ProductionPlan; orders: number }) {
  const { data, act } = useKitchen()
  const seen = data.checks[day] ?? {}

  const groups: [string, Item[]][] = [
    [
      "Masas",
      plan.doughRows.map((d) => {
        const name = byId(data.recipes, d.recipeId)?.name ?? "Masa"
        return d.toMake > 0
          ? { key: `m-${d.recipeId}`, label: `Hacer ${grams(d.toMake)} de ${name.toLowerCase()}`, sub: `${fmtN(d.batches, 2)} tandas${d.fromLots ? ` · ${grams(d.fromLots)} salen del lote guardado` : ""}` }
          : { key: `m-${d.recipeId}`, label: name, sub: "Alcanza el lote guardado: no hay que hacer" }
      }),
    ],
    [
      "Hornear",
      Object.entries(plan.units).map(([id, n]) => {
        const p = byId(data.products, id)
        // Las tortas por tamaño pesan según el molde: el total sale del plan.
        const total = plan.unitGrams[id] ?? n * (p?.grams ?? 0)
        return { key: `h-${id}`, label: `${n} ${pluralName((p?.name ?? "").toLowerCase(), n)}`, sub: p ? `${fmtN(total / n)} g cada una · ${grams(total)} en total` : "", look: p?.look }
      }),
    ],
    [
      "Armar cajas",
      Object.entries(plan.boxes).map(([id, n]) => ({ key: `b-${id}`, label: `${n} × ${byId(data.presentations, id)?.name ?? ""}`, sub: "Con su empaque y sticker" })),
    ],
  ]

  const all = groups.flatMap(([, items]) => items)
  const done = all.filter((i) => seen[i.key]).length
  const pct = all.length ? Math.round((done / all.length) * 100) : 0

  return (
    <div className="stack">
      <div className="prod-progress" role="group" aria-label="Avance de la producción">
        <div className="row between small">
          <b>
            {done} de {all.length} listos
          </b>
          <span className="muted">{orders} {orders === 1 ? "pedido" : "pedidos"}</span>
        </div>
        <div className="bar" aria-hidden="true">
          <span style={{ width: `${pct}%` }} />
        </div>
      </div>
      {groups.map(([title, items]) =>
        items.length ? (
          <section key={title} className="prod-group" aria-label={title}>
            <h2>{title}</h2>
            {items.map((it) => {
              const on = !!seen[it.key]
              return (
                <button
                  key={it.key}
                  type="button"
                  className={on ? "prod-check on" : "prod-check"}
                  aria-pressed={on}
                  onClick={() => act(`/production/${day}/checks`, "PUT", { key: it.key, done: !on })}
                >
                  <span className="prod-box" aria-hidden="true">
                    {on ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12l5 5 9-10" />
                      </svg>
                    ) : null}
                  </span>
                  {it.look !== undefined ? <Cookie look={it.look} size={30} /> : null}
                  <span className="prod-text">
                    <b>{it.label}</b>
                    <span>{it.sub}</span>
                  </span>
                </button>
              )
            })}
          </section>
        ) : null,
      )}
    </div>
  )
}
