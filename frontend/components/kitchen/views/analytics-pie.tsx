"use client"

import { useState } from "react"
import { money } from "@/lib/kitchen/format"
import type { Seller } from "@/lib/kitchen/analytics"
import { Cherry, SliceDrawing } from "./pie-patterns"

// «¿Qué es lo que más vendes?» como una torta vista desde arriba: cada tajada es
// qué parte de la plata dejó cada cosa. Sin lista de colores: al tocar una
// tajada, el centro dice qué es, su porcentaje y cuánto dejó. Cada cosa vendida
// es una tajada de dona con su propio glaseado (hasta 9; si hay más, el resto
// va junto en «Lo demás»).

const MAX = 9
type Slice = { name: string; sales: number; units: number; share: number; start: number; end: number }

function slices(list: Seller[]): Slice[] {
  const sold = list.filter((s) => s.sales > 0)
  const keep = sold.length > MAX + 1 ? MAX : sold.length
  const rest = sold.slice(keep)
  const parts: Omit<Slice, "start" | "end">[] = sold.slice(0, keep).map(({ name, sales, units, share }) => ({ name, sales, units, share }))
  if (rest.length) {
    parts.push({ name: `Lo demás (${rest.length} cosas)`, sales: rest.reduce((a, s) => a + s.sales, 0), units: rest.reduce((a, s) => a + s.units, 0), share: rest.reduce((a, s) => a + s.share, 0) })
  }
  // Dónde empieza y termina cada tajada (en radianes, desde arriba).
  let at = 0
  return parts.map((p) => {
    const start = at
    at += p.share * Math.PI * 2
    return { ...p, start, end: at }
  })
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
                <SliceDrawing i={i} start={p.start} end={p.end} />
                {i === sel ? <Cherry angle={mid} /> : null}
                {p.share >= 0.07 ? (
                  // El porcentaje va en una etiqueta crema para leerse sobre la cobertura.
                  <g transform={`translate(${100 + 68 * Math.sin(mid)} ${100 - 68 * Math.cos(mid)})`} className="pct">
                    <rect x="-15" y="-9" width="30" height="18" rx="9" />
                    <text y="4" textAnchor="middle">{Math.round(p.share * 100)}%</text>
                  </g>
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
