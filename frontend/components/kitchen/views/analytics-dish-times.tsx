"use client"

import { fmtN } from "@/lib/kitchen/format"
import type { DishTime, KitchenSnapshot } from "@/lib/kitchen/types"
import { Empty } from "../shared"

// Cuánto tarda la cocina en cada plato (Julieth, 2026-10-20): de "Enviar a cocina" a "Listo", en 4 semanas. Es el
// tiempo de la comanda donde iba el plato. Con menos de 3 comandas no se muestra (un solo día raro engaña).
const MIN_COUNT = 3
const SHOWN = 8

export function DishTimeCard({ data }: { data: KitchenSnapshot }) {
  const { kitchenNormalMin: normal, kitchenMaxMin: max } = data.settings
  const name = (t: DishTime) => {
    const p = data.presentations.find((x) => x.id === t.presentationId)
    const flavor = data.products.find((x) => x.id === t.productId)?.name
    return [p?.name ?? "Plato", flavor && flavor !== p?.name ? flavor : null].filter(Boolean).join(" · ")
  }
  const list = data.dishTimes.filter((t) => t.count >= MIN_COUNT).sort((a, b) => b.minutes - a.minutes)
  const all = data.dishTimes.reduce((a, t) => a + t.count, 0)
  const avg = all ? data.dishTimes.reduce((a, t) => a + t.minutes * t.count, 0) / all : 0
  return (
    <div className="card">
      <h2>¿Qué platos tardan más en cocina?</h2>
      <p className="small muted">Desde que se envían hasta que la cocina los marca listos, últimas 4 semanas.</p>
      {list.length ? (
        <div className="list">
          {list.slice(0, SHOWN).map((t) => (
            <div className="it" key={`${t.presentationId}|${t.productId}`}>
              <div>
                <b>{name(t)}</b>
                <div className="small muted">{t.count} veces</div>
              </div>
              <span className={`chip ${t.minutes > max ? "bad" : t.minutes > normal ? "warn" : "good"}`} style={{ whiteSpace: "nowrap" }}>{fmtN(t.minutes, 1)} min</span>
            </div>
          ))}
        </div>
      ) : (
        <Empty>Aún no hay suficientes comandas listas.</Empty>
      )}
      {list.length ? (
        <p className="conclusion">
          En promedio un plato sale en <b>{fmtN(avg, 1)} min</b>; tu tiempo normal es {normal} min.
        </p>
      ) : null}
    </div>
  )
}
