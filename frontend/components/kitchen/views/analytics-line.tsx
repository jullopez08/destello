"use client"

import { useState } from "react"
import { dateLabel, fmtN, money } from "@/lib/kitchen/format"
import type { WeekStat } from "@/lib/kitchen/analytics"

// «¿Cómo van tus ventas cada semana?» en línea de mermelada de fresa que
// chorrea: se ve de un vistazo si sube o baja. Eje de la izquierda: miles de
// pesos; abajo: la semana (día en que empieza). La semana en curso va más
// clarita. Al tocar un punto sale el detalle. Solo colores lisos y un degradado.

const JAM = "#c8102e"
const DRIPS = [9, 14, 7, 12, 10, 15, 8, 11]

// Gota que cuelga de la línea: más larga o más corta según el punto.
const drip = (x: number, y: number, len: number) =>
  `M${x - 2.6} ${y} Q${x - 2.6} ${y + len} ${x} ${y + len + 3} Q${x + 2.6} ${y + len} ${x + 2.6} ${y} Z`

const W = 340, H = 210, L = 38, R = 14, T = 26, B = 34

const range = (s: string, e: string, today: string) => `${dateLabel(s, today).toLowerCase()} al ${dateLabel(e, today).toLowerCase()}`

export function WeekLine({ weeks, today }: { weeks: WeekStat[]; today: string }) {
  const [sel, setSel] = useState(weeks.length - 1)
  const done = weeks.filter((w) => !w.current)
  const avg = done.length ? done.reduce((a, w) => a + w.sales, 0) / done.length : 0
  const best = [...done].sort((a, b) => b.sales - a.sales)[0]
  const peak = Math.max(...weeks.map((w) => w.sales))
  const step = peak > 2e6 ? 500000 : 100000
  const top = Math.max(step, Math.ceil(peak / step) * step)
  const x = (i: number) => L + (i * (W - L - R)) / Math.max(1, weeks.length - 1)
  const y = (v: number) => H - B - (v / top) * (H - B - T)
  const k = (v: number) => fmtN(v / 1000)
  const pts = weeks.map((w, i) => [x(i), y(w.sales)] as const)
  const closed = pts.slice(0, -1).map(([px, py]) => `${px},${py}`).join(" ")
  const area = `M${pts[0][0]},${H - B} L${pts.map(([px, py]) => `${px},${py}`).join(" L")} L${pts[pts.length - 1][0]},${H - B} Z`
  const w = weeks[sel]

  return (
    <div className="wline">
      <div className="axis-title">Miles de pesos vendidos ↑</div>
      <svg viewBox={`0 0 ${W} ${H}`} role="group" aria-label="Ventas por semana">
        <defs>
          <linearGradient id="wline-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={JAM} stopOpacity="0.28" />
            <stop offset="100%" stopColor={JAM} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0, top / 2, top].map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} className="grid" />
            <text x={L - 6} y={y(t) + 4} textAnchor="end" className="tick">{k(t)}</text>
          </g>
        ))}
        {avg ? <line x1={L} x2={W - R} y1={y(avg)} y2={y(avg)} className="avg" /> : null}
        <path d={area} fill="url(#wline-fill)" />
        {pts.slice(0, -1).map(([px, py], i) => (
          <path key={i} d={drip(px, py + 2, DRIPS[i % DRIPS.length])} fill={JAM} className="jam-drip" />
        ))}
        <polyline points={closed} className="jam" />
        <line x1={pts[pts.length - 2][0]} y1={pts[pts.length - 2][1]} x2={pts[pts.length - 1][0]} y2={pts[pts.length - 1][1]} className="jam now" />
        <polyline points={closed} className="jam-shine" transform="translate(-0.6 -1.8)" />
        {weeks.map((wk, i) => {
          const [px, py] = pts[i]
          const [d, m] = dateLabel(wk.start, "").split(" ")
          return (
            <g
              key={wk.start}
              role="button"
              tabIndex={0}
              aria-pressed={i === sel}
              aria-label={`${wk.current ? "Esta semana" : range(wk.start, wk.end, today)}: ${money(wk.sales)}`}
              className={`pt${i === sel ? " on" : ""}${wk === best ? " best" : ""}${wk.current ? " cur" : ""}`}
              onClick={() => setSel(i)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setSel(i)}
            >
              <circle cx={px} cy={py} r={16} className="hit" />
              <circle cx={px} cy={py} r={i === sel ? 6.5 : 4.5} className="dot" />
              <text x={px} y={py - 11} textAnchor="middle" className="val">{k(wk.sales)}</text>
              <text x={px} y={H - B + 15} textAnchor="middle" className="xl">{wk.current ? "Esta" : d}</text>
              <text x={px} y={H - B + 27} textAnchor="middle" className="xs">{wk.current ? "semana" : m}</text>
            </g>
          )
        })}
      </svg>
      <div className="axis-title x">Semana (día en que empieza) →</div>
      <div className="wline-detail" aria-live="polite">
        <b>{w.current ? "Esta semana (va en curso)" : `Semana del ${range(w.start, w.end, today)}`}</b>
        <span>
          {money(w.sales)} · {w.orders} {w.orders === 1 ? "pedido" : "pedidos"}
          {w === best ? " · tu mejor semana" : ""}
        </span>
        <span className="small muted">Toca un punto para ver esa semana. Rayas: tu promedio.</span>
      </div>
      <p className="conclusion">
        {best && best.sales > 0 ? <>Tu mejor semana fue la del <b>{range(best.start, best.end, today)}</b> con <b>{money(best.sales)}</b>. </> : null}
        En promedio vendes <b>{money(avg)}</b> por semana.
      </p>
    </div>
  )
}
