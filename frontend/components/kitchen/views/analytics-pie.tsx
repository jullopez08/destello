"use client"

import { useState } from "react"
import { money } from "@/lib/kitchen/format"
import type { Seller } from "@/lib/kitchen/analytics"

// «¿Qué es lo que más vendes?» como una torta vista desde arriba: cada tajada es
// qué parte de la plata dejó cada cosa. Sin lista de colores: al tocar una
// tajada, el centro dice qué es, su porcentaje y cuánto dejó. Las 5 primeras
// van con su color pastel y el resto junto en «Lo demás».

const COLORS = ["#f6a96c", "#f48fb1", "#b39ddb", "#7fc4e8", "#8fd3b0"]
const REST = "#eadfc8"
const R = 92, IN = 52

type Slice = { name: string; sales: number; units: number; share: number; color: string; start: number; end: number }

function slices(list: Seller[]): Slice[] {
  const top = list.slice(0, 5).map((s, i) => ({ ...s, color: COLORS[i] }))
  const rest = list.slice(5).filter((s) => s.sales > 0)
  const parts: Omit<Slice, "start" | "end">[] = top.map(({ name, sales, units, share, color }) => ({ name, sales, units, share, color }))
  if (rest.length) {
    parts.push({ name: `Lo demás (${rest.length} cosas)`, sales: rest.reduce((a, s) => a + s.sales, 0), units: rest.reduce((a, s) => a + s.units, 0), share: rest.reduce((a, s) => a + s.share, 0), color: REST })
  }
  // Dónde empieza y termina cada tajada (en radianes, desde arriba).
  let at = 0
  return parts.map((p) => {
    const start = at
    at += p.share * Math.PI * 2
    return { ...p, start, end: at }
  })
}

const pt = (a: number, r: number) => `${100 + r * Math.sin(a)} ${100 - r * Math.cos(a)}`

function ring(start: number, end: number) {
  if (end - start >= Math.PI * 2 - 1e-6) end = start + Math.PI * 2 - 1e-4
  const large = end - start > Math.PI ? 1 : 0
  return `M${pt(start, R)} A${R} ${R} 0 ${large} 1 ${pt(end, R)} L${pt(end, IN)} A${IN} ${IN} 0 ${large} 0 ${pt(start, IN)} Z`
}

export function SellerPie({ list }: { list: Seller[] }) {
  const parts = slices(list)
  const [sel, setSel] = useState(0)
  const s = parts[sel] ?? parts[0]
  return (
    <div className="torta">
      <div className="torta-plate">
        <svg viewBox="0 0 200 200" role="group" aria-label="Qué parte de lo vendido es cada cosa">
          <circle cx="100" cy="100" r="98" className="plate" />
          {parts.map((p, i) => {
            const mid = (p.start + p.end) / 2
            const lift = i === sel ? 5 : 0
            return (
              <g
                key={p.name}
                role="button"
                tabIndex={0}
                aria-pressed={i === sel}
                aria-label={`${p.name}: ${Math.round(p.share * 100)} %`}
                className={`slice${i === sel ? " on" : ""}`}
                transform={`translate(${lift * Math.sin(mid)} ${-lift * Math.cos(mid)})`}
                onClick={() => setSel(i)}
                onMouseEnter={() => setSel(i)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setSel(i)}
              >
                <path d={ring(p.start, p.end)} fill={p.color} />
                {p.share >= 0.07 ? (
                  <text x={100 + ((R + IN) / 2) * Math.sin(mid)} y={100 - ((R + IN) / 2) * Math.cos(mid) + 4} textAnchor="middle" className="pct">
                    {Math.round(p.share * 100)}%
                  </text>
                ) : null}
              </g>
            )
          })}
        </svg>
        <div className="torta-center" aria-live="polite">
          <b className="num">{Math.round(s.share * 100)}&nbsp;%</b>
          <span className="t">{s.name}</span>
          <span className="small muted">{money(s.sales)} · {s.units} vendidas</span>
        </div>
      </div>
      <p className="small muted" style={{ textAlign: "center" }}>Toca una tajada para ver qué es.</p>
    </div>
  )
}
