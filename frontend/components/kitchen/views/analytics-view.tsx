"use client"

import { orderSubtotal, useKitchen } from "@/lib/kitchen/store"
import { addDays, presentationCost, presentationHealth } from "@/lib/kitchen/rules"
import { fmtN, money } from "@/lib/kitchen/format"
import { Empty, Kpi, PageHead } from "../shared"

// ── Analítica ──

function WeekChart({ weeks }: { weeks: number[] }) {
  const W = 560, H = 230, pl = 56, pb = 28, pt = 24
  const max = Math.max(250000, Math.ceil(Math.max(...weeks) / 250000) * 250000)
  const bw = (W - pl - 10) / weeks.length
  const y = (v: number) => H - pb - (v / max) * (H - pb - pt)
  const ticks = [0, max / 2, max]
  const label = (t: number) => (t >= 1e6 ? fmtN(t / 1e6, 1) + " M" : fmtN(t / 1000) + " mil")
  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Ventas por semana">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pl} x2={W - 6} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeDasharray="3 4" />
            <text x={pl - 8} y={y(t) + 4} textAnchor="end">{label(t)}</text>
          </g>
        ))}
        {weeks.map((v, i) => {
          const x = pl + i * bw + bw * 0.18, w = bw * 0.64, last = i === weeks.length - 1
          return (
            <g key={i}>
              <rect x={x} y={y(v)} width={w} height={Math.max(0, H - pb - y(v))} rx={8} fill={last ? "var(--accent-deep)" : "var(--peach)"}>
                <title>{money(v)}</title>
              </rect>
              {last ? <text className="lbl" x={x + w / 2} y={y(v) - 7} textAnchor="middle">{fmtN(v / 1000)} mil</text> : null}
              <text x={x + w / 2} y={H - 8} textAnchor="middle">{last ? "Esta" : "S" + (i + 1)}</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export function AnalyticsView() {
  const { data, rules } = useKitchen()
  const live = data.orders.filter((o) => o.status !== "CANCELLED")
  // 8 semanas que terminan hoy
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const end = addDays(data.today, -7 * (7 - i))
    const start = addDays(end, -6)
    return live.filter((o) => o.orderedOn >= start && o.orderedOn <= end).reduce((a, o) => a + orderSubtotal(o), 0)
  })
  const last4 = weeks.slice(-4).reduce((a, b) => a + b, 0)
  const prev4 = weeks.slice(0, 4).reduce((a, b) => a + b, 0)
  const change = prev4 ? Math.round(((last4 - prev4) / prev4) * 100) : null
  const nOrders = live.filter((o) => o.orderedOn > addDays(data.today, -28)).length
  const units: Record<string, number> = {}
  for (const o of live) if (o.orderedOn > addDays(data.today, -56)) for (const l of o.lines) units[l.presentationId] = (units[l.presentationId] ?? 0) + l.qty
  const ranked = data.presentations.map((p) => ({ p, n: units[p.id] ?? 0 })).sort((a, b) => b.n - a.n)
  const max = Math.max(1, ...ranked.map((r) => r.n))
  const flagged = data.presentations
    .map((p) => ({ p, h: presentationHealth(p, rules, data.settings.targetMargin), c: presentationCost(p, rules) }))
    .filter((x) => x.h.kind !== "ok")

  return (
    <>
      <PageHead title="Analítica" sub="Qué se vende más, qué se vende poco y qué productos no dejan ganancia.">
        <span className="pill">Últimas 8 semanas</span>
      </PageHead>
      <div className="grid g4">
        <Kpi v={money(last4)} l="Ventas de las últimas 4 semanas" s={change === null ? "Sin semanas anteriores para comparar" : `${change >= 0 ? "+" : ""}${change} % frente a las 4 anteriores`} c="c-accent" />
        <Kpi v={nOrders} l="Pedidos" s="en 4 semanas" c="c-lilac" />
        <Kpi v={money(nOrders ? last4 / nOrders : 0)} l="Ticket promedio" s="sin domicilio" c="c-strawberry" />
        <Kpi v={flagged.length} l="Con margen bajo o pérdida" s="revisa el precio" c="c-peach" />
      </div>
      <div className="grid g2" style={{ marginTop: 16 }}>
        <div className="card">
          <h2>Ventas por semana</h2>
          <WeekChart weeks={weeks} />
        </div>
        <div className="card">
          <h2>Los más vendidos</h2>
          <div className="hbars">
            {ranked.slice(0, 5).map((r) => (
              <div className="hbar" key={r.p.id}>
                <span className="t">{r.p.name}</span>
                <span className="n">{r.n}</span>
                <div className="bar"><span style={{ width: `${(r.n / max) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <h2>Productos que no dejan ganancia</h2>
          {flagged.length ? (
            <div className="list">
              {flagged.map((x) => (
                <div className="it" key={x.p.id}>
                  <div>
                    <b>{x.p.name}</b>
                    <div className="small muted">Precio {money(x.p.price)} · cuesta {money(x.c)}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span className={`chip ${x.h.kind}`}>{x.h.label}</span>
                    <div className="small" style={{ marginTop: 4 }}>Sube a <b>{money(x.h.suggested ?? 0)}</b></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty>Todos los productos tienen buen margen.</Empty>
          )}
          <p className="small muted" style={{ marginTop: 10 }}>El precio sugerido busca un margen del {data.settings.targetMargin} %, que puedes cambiar en Configuración.</p>
        </div>
        <div className="card">
          <h2>Los que menos se venden</h2>
          <div className="hbars">
            {ranked.slice(-4).reverse().map((r) => (
              <div className="hbar" key={r.p.id}>
                <span className="t">{r.p.name}</span>
                <span className="n">{r.n}</span>
                <div className="bar warn"><span style={{ width: `${(r.n / max) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
