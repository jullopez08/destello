"use client"

import { DAYS, dateLabel, fmtN, money } from "@/lib/kitchen/format"
import type { Period } from "@/lib/kitchen/analytics"
import { change } from "@/lib/kitchen/analytics"

// Gráficas de Analítica. Cada una responde una pregunta, dice de qué fechas
// habla y trae una frase con la conclusión, para no tener que interpretarla.

export const compact = (n: number) => (n >= 1e6 ? `$ ${fmtN(n / 1e6, 1)} M` : n >= 1000 ? `$ ${fmtN(n / 1000)} mil` : money(n))
const range = (start: string, end: string, today: string) => `${dateLabel(start, today).toLowerCase()} al ${dateLabel(end, today).toLowerCase()}`

// Sube, baja o igual, con flecha y color.
export function Trend({ now, before }: { now: number; before: number }) {
  const c = change(now, before)
  if (c === null) return <span className="trend flat">Sin datos de antes para comparar</span>
  if (c === 0) return <span className="trend flat">Igual que antes</span>
  return <span className={`trend ${c > 0 ? "up" : "down"}`}>{c > 0 ? "▲" : "▼"} {Math.abs(c)} % {c > 0 ? "más" : "menos"}</span>
}

// Resumen en una frase: las últimas 4 semanas frente a las 4 anteriores, con fechas.
export function Summary({ now, before, today, tables }: { now: Period; before: Period; today: string; tables?: boolean }) {
  const c = change(now.sales, before.sales)
  return (
    <div className="card c-accent summary">
      <div className="eyebrow">Resumen de las últimas 4 semanas</div>
      <p>
        Del <b>{range(now.start, now.end, today)}</b> vendiste <b>{money(now.sales)}</b> en <b>{now.orders}</b> {tables ? (now.orders === 1 ? "pedido o mesa" : "pedidos y mesas") : now.orders === 1 ? "pedido" : "pedidos"}.
        {c === null
          ? " Todavía no hay semanas anteriores para comparar."
          : c === 0
            ? " Igual que en las 4 semanas anteriores."
            : ` Es ${Math.abs(c)} % ${c > 0 ? "más" : "menos"} que del ${range(before.start, before.end, today)} (${money(before.sales)}).`}
      </p>
    </div>
  )
}

// Una cifra con lo que significa y cómo estaba antes.
export function Stat({ label, value, hint, now, before, beforeText }: { label: string; value: string; hint: string; now: number; before: number; beforeText: string }) {
  return (
    <div className="card stat">
      <span className="l">{label}</span>
      <span className="v num">{value}</span>
      <span className="small muted">{hint}</span>
      <Trend now={now} before={before} />
      <span className="small muted">Antes: {beforeText}</span>
    </div>
  )
}

// Pedidos por día de producción: ayuda a saber qué días habrá más trabajo.
export function WeekdayBars({ counts }: { counts: number[] }) {
  const order = [1, 2, 3, 4, 5, 6, 0]
  const max = Math.max(1, ...counts)
  const top = order.reduce((a, d) => (counts[d] > counts[a] ? d : a), order[0])
  return (
    <>
      <div className="dbars" role="list" aria-label="Pedidos por día de la semana">
        {order.map((d) => (
          <div className={`dbar${d === top && counts[d] ? " best" : ""}`} role="listitem" key={d}>
            <span className="n num">{counts[d]}</span>
            <div className="col"><span style={{ height: `${(counts[d] / max) * 100}%` }} /></div>
            <span className="t">{DAYS[d].slice(0, 3)}</span>
          </div>
        ))}
      </div>
      <p className="conclusion">
        {counts[top] ? <>Los <b>{DAYS[top]}{DAYS[top].endsWith("s") ? "" : "s"}</b> produces más: ten todo listo desde antes.</> : "Todavía no hay pedidos para ver qué días tienes más trabajo."}
      </p>
    </>
  )
}
