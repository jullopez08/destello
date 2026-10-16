"use client"

import { money } from "@/lib/kitchen/format"
import type { Seller } from "@/lib/kitchen/analytics"

// «¿Qué es lo que más vendes?» en torta: cada tajada es qué parte de la plata
// vendida dejó cada cosa. Las 5 primeras van con su color y el resto junto en
// «Lo demás». El porcentaje va dentro de la tajada cuando cabe y siempre en la lista.

const COLORS = ["#f2994a", "#e86a92", "#9b7ede", "#5aa9e6", "#4fb286"]
const REST = "#d9c9a3"

type Slice = { name: string; sales: number; units: number; share: number; color: string; start: number; end: number }

function slices(list: Seller[]): Slice[] {
  const top = list.slice(0, 5).map((s, i) => ({ name: s.name, sales: s.sales, units: s.units, share: s.share, color: COLORS[i], start: 0, end: 0 }))
  const rest = list.slice(5)
  const restSales = rest.reduce((a, s) => a + s.sales, 0)
  if (restSales > 0) {
    top.push({ name: `Lo demás (${rest.filter((s) => s.sales > 0).length})`, sales: restSales, units: rest.reduce((a, s) => a + s.units, 0), share: rest.reduce((a, s) => a + s.share, 0), color: REST, start: 0, end: 0 })
  }
  // Dónde empieza y termina cada tajada (en radianes, desde arriba).
  let at = 0
  return top.map((p) => {
    const start = at
    at += p.share * Math.PI * 2
    return { ...p, start, end: at }
  })
}

const point = (angle: number, r: number) => [100 + r * Math.sin(angle), 100 - r * Math.cos(angle)]

export function SellerPie({ list }: { list: Seller[] }) {
  const parts = slices(list)
  return (
    <div className="pie">
      <svg viewBox="0 0 200 200" role="img" aria-label="Qué parte de lo vendido es cada producto">
        {parts.map(({ start, end, ...p }) => {
          const [x1, y1] = point(start, 96)
          const [x2, y2] = point(end, 96)
          const [lx, ly] = point((start + end) / 2, 62)
          const large = end - start > Math.PI ? 1 : 0
          const path = p.share >= 0.999 ? "M100 4 A96 96 0 1 1 99.99 4 Z" : `M100 100 L${x1} ${y1} A96 96 0 ${large} 1 ${x2} ${y2} Z`
          return (
            <g key={p.name}>
              <path d={path} fill={p.color} stroke="var(--surface)" strokeWidth="2">
                <title>{`${p.name}: ${Math.round(p.share * 100)} %`}</title>
              </path>
              {p.share >= 0.06 ? (
                <text x={lx} y={ly + 5} textAnchor="middle" className="pie-pct">{Math.round(p.share * 100)} %</text>
              ) : null}
            </g>
          )
        })}
      </svg>
      <ul className="pie-legend">
        {parts.map((p) => (
          <li key={p.name}>
            <i style={{ background: p.color }} />
            <span className="t">{p.name}</span>
            <b className="num">{Math.round(p.share * 100)} %</b>
            <span className="small muted">{money(p.sales)} · {p.units} vendidas</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
