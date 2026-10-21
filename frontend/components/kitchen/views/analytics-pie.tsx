"use client"

import { useState } from "react"
import { money } from "@/lib/kitchen/format"
import type { Seller } from "@/lib/kitchen/analytics"
import { Cherry, SliceDrawing } from "./pie-patterns"
import { Basil, PizzaSlice } from "./pizza-patterns"

// Torta de dona para «lo que más vendes» y «lo que casi no se vende»: cada
// tajada es una cosa de la lista, del tamaño de lo que dejó frente a las demás
// de esa misma lista. Sin lista de colores: al tocar una tajada, el centro dice
// qué es, qué parte de TODO lo vendido es y cuánto dejó. Si la lista pasa de
// `max`, el resto va junto en «Lo demás». `offset` corre los colores para que
// las dos tortas no compartan glaseados.

type Slice = { name: string; sales: number; units: number; share: number; start: number; end: number }

function slices(list: Seller[], max: number): Slice[] {
  const sold = list.filter((s) => s.sales > 0)
  const keep = sold.length > max + 1 ? max : sold.length
  const rest = sold.slice(keep)
  const parts: Omit<Slice, "start" | "end">[] = sold.slice(0, keep).map(({ name, sales, units, share }) => ({ name, sales, units, share }))
  if (rest.length) {
    parts.push({ name: `Lo demás (${rest.length} cosas)`, sales: rest.reduce((a, s) => a + s.sales, 0), units: rest.reduce((a, s) => a + s.units, 0), share: rest.reduce((a, s) => a + s.share, 0) })
  }
  // Dónde empieza y termina cada tajada (en radianes, desde arriba).
  const total = parts.reduce((a, p) => a + p.sales, 0) || 1
  let at = 0
  return parts.map((p) => {
    const start = at
    at += (p.sales / total) * Math.PI * 2
    return { ...p, start, end: at }
  })
}

/** `food`: negocio de comida (pizza); si no, de postres y panes (dona glaseada). */
export function SellerPie({ list, max = 5, offset = 0, food = false }: { list: Seller[]; max?: number; offset?: number; food?: boolean }) {
  const parts = slices(list, max)
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
                {food ? <PizzaSlice i={i + offset} start={p.start} end={p.end} /> : <SliceDrawing i={i + offset} start={p.start} end={p.end} />}
                {i === sel ? (food ? <Basil angle={mid} /> : <Cherry angle={mid} />) : null}
                {p.end - p.start >= 0.42 ? (
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
          <span className="small muted">de todo lo vendido</span>
          <span className="t">{s.name}</span>
          <span className="small muted">{money(s.sales)} · {s.units} vendidas</span>
        </div>
      </div>
      <p className="small muted" style={{ textAlign: "center" }}>Toca una tajada para ver qué es.</p>
    </div>
  )
}
