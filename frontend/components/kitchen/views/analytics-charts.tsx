"use client"

import { DAYS, dateLabel, fmtN, money } from "@/lib/kitchen/format"
import type { Period, Seller, WeekStat } from "@/lib/kitchen/analytics"
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
  return <span className={`trend ${c > 0 ? "up" : "down"}`}>{c > 0 ? "▲" : "▼"} {Math.abs(c)} % {c > 0 ? "más" : "menos"} que antes</span>
}

// Resumen en una frase: las últimas 4 semanas frente a las 4 anteriores, con fechas.
export function Summary({ now, before, today }: { now: Period; before: Period; today: string }) {
  const c = change(now.sales, before.sales)
  return (
    <div className="card c-accent summary">
      <div className="eyebrow">Resumen de las últimas 4 semanas</div>
      <p>
        Del <b>{range(now.start, now.end, today)}</b> vendiste <b>{money(now.sales)}</b> en <b>{now.orders}</b> {now.orders === 1 ? "pedido" : "pedidos"}.
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

// Ventas semana a semana en columnas. El eje de la izquierda es la plata
// (en miles de pesos) y el de abajo, la semana (el día en que empieza).
export function WeekBars({ weeks, today }: { weeks: WeekStat[]; today: string }) {
  const done = weeks.filter((w) => !w.current)
  const avg = done.length ? done.reduce((a, w) => a + w.sales, 0) / done.length : 0
  const best = [...done].sort((a, b) => b.sales - a.sales)[0]
  const step = Math.max(...weeks.map((w) => w.sales)) > 2e6 ? 500000 : 100000
  const top = Math.max(step, Math.ceil(Math.max(...weeks.map((w) => w.sales)) / step) * step)
  const pct = (v: number) => `${(v / top) * 100}%`
  const k = (v: number) => fmtN(v / 1000)
  return (
    <>
      <div className="vchart">
        <div className="axis-title">Miles de pesos vendidos ↑</div>
        <div className="plot" role="list" aria-label="Ventas por semana">
          {[0, top / 2, top].map((t) => (
            <div className="gridline" style={{ bottom: pct(t) }} key={t}>
              <span>{k(t)}</span>
            </div>
          ))}
          {avg ? <div className="avgline" style={{ bottom: pct(avg) }} /> : null}
          {weeks.map((w) => (
            <div className={`vcol${w.current ? " now" : ""}${w === best ? " best" : ""}`} role="listitem" key={w.start} aria-label={`${range(w.start, w.end, today)}: ${money(w.sales)}, ${w.orders} pedidos`}>
              <span className="vbar" style={{ height: pct(w.sales) }}>
                <b>{k(w.sales)}</b>
              </span>
            </div>
          ))}
        </div>
        <div className="xlabels" aria-hidden="true">
          {weeks.map((w) => {
            const [d, m] = dateLabel(w.start, "").split(" ")
            return (
              <span className={w.current ? "now" : ""} key={w.start}>
                {w.current ? "Esta" : d}
                <small>{w.current ? "semana" : m}</small>
              </span>
            )
          })}
        </div>
        <div className="axis-title x">Semana (día en que empieza) →</div>
        <div className="legend">
          <span><i className="sw best" /> Tu mejor semana</span>
          <span><i className="sw now" /> Esta semana (va en curso)</span>
          {avg ? <span><i className="sw avg" /> Promedio: {k(avg)} mil</span> : null}
        </div>
      </div>
      <p className="conclusion">
        {best && best.sales > 0 ? <>Tu mejor semana fue la del <b>{range(best.start, best.end, today)}</b> con <b>{money(best.sales)}</b>. </> : null}
        En promedio vendes <b>{money(avg)}</b> por semana (la línea punteada).
      </p>
    </>
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
        {counts[top] ? <>Los <b>{DAYS[top]}{DAYS[top].endsWith("s") ? "" : "s"}</b> es cuando más produces: ten listos insumos y masa desde antes.</> : "Todavía no hay pedidos para ver qué días tienes más trabajo."}
      </p>
    </>
  )
}

// Lo que más vende: unidades, plata y qué parte de las ventas es.
export function SellerBars({ list, warn }: { list: Seller[]; warn?: boolean }) {
  const max = Math.max(1, ...list.map((s) => s.sales))
  return (
    <div className="hbars">
      {list.map((s) => (
        <div className="hbar" key={s.id}>
          <span className="t">{s.name}</span>
          <span className="n">{compact(s.sales)}</span>
          <div className={`bar${warn ? " warn" : ""}`}><span style={{ width: `${(s.sales / max) * 100}%` }} /></div>
          <span className="small muted" style={{ gridColumn: "1 / -1" }}>
            {s.units} vendidas · {Math.round(s.share * 100)} % de lo que vendiste
          </span>
        </div>
      ))}
    </div>
  )
}
