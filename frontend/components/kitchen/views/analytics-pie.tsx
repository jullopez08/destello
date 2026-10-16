"use client"

import { useState } from "react"
import { money } from "@/lib/kitchen/format"
import type { Seller } from "@/lib/kitchen/analytics"
import { PiePatterns, REST_TOPPING, TOPPINGS } from "./pie-patterns"
import type { Topping } from "./pie-patterns"

// «¿Qué es lo que más vendes?» como una torta vista desde arriba: cada tajada es
// qué parte de la plata dejó cada cosa. Sin lista de colores: al tocar una
// tajada, el centro dice qué es, su porcentaje y cuánto dejó. Las 5 primeras
// llevan cada una su cobertura (chispas, glaseado, confeti, espiral de canela,
// lunares) y el resto va junto en «Lo demás» con migas.
const R = 92, IN = 52

type Slice = { name: string; sales: number; units: number; share: number; topping: Topping; start: number; end: number }

function slices(list: Seller[]): Slice[] {
  const top = list.slice(0, 5).map((s, i) => ({ ...s, topping: TOPPINGS[i] }))
  const rest = list.slice(5).filter((s) => s.sales > 0)
  const parts: Omit<Slice, "start" | "end">[] = top.map(({ name, sales, units, share, topping }) => ({ name, sales, units, share, topping }))
  if (rest.length) {
    parts.push({ name: `Lo demás (${rest.length} cosas)`, sales: rest.reduce((a, s) => a + s.sales, 0), units: rest.reduce((a, s) => a + s.units, 0), share: rest.reduce((a, s) => a + s.share, 0), topping: REST_TOPPING })
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
          <PiePatterns />
          <circle cx="100" cy="100" r="98" className="plate" />
          <g filter="url(#torta-sombra)">
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
                <path d={ring(p.start, p.end)} fill={`url(#torta-base-${p.topping.id})`} className="base" />
                {p.topping.decor === "rings" ? (
                  // Espiral de canela: anillos como la galleta de rollo.
                  <g clipPath={`url(#torta-clip-${i})`} className="decor">
                    <clipPath id={`torta-clip-${i}`}><path d={ring(p.start, p.end)} /></clipPath>
                    {[58, 66, 74, 82, 90].map((rr) => <circle key={rr} cx="100" cy="100" r={rr} fill="none" stroke="#c98642" strokeWidth="2.6" />)}
                  </g>
                ) : (
                  <path d={ring(p.start, p.end)} fill={`url(#torta-decor-${p.topping.decor})`} className="decor" />
                )}
                {p.share >= 0.07 ? (
                  // El porcentaje va en una etiqueta crema para leerse sobre la cobertura.
                  <g transform={`translate(${100 + ((R + IN) / 2) * Math.sin(mid)} ${100 - ((R + IN) / 2) * Math.cos(mid)})`} className="pct">
                    <rect x="-15" y="-9" width="30" height="18" rx="9" />
                    <text y="4" textAnchor="middle">{Math.round(p.share * 100)}%</text>
                  </g>
                ) : null}
              </g>
            )
          })}
          </g>
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
