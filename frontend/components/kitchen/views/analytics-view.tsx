"use client"

import { useKitchen } from "@/lib/kitchen/store"
import { presentationCost, presentationHealth } from "@/lib/kitchen/rules"
import { analytics } from "@/lib/kitchen/analytics"
import { money } from "@/lib/kitchen/format"
import { Empty, PageHead } from "../shared"
import { SellerBars, Stat, Summary, WeekBars, WeekdayBars } from "./analytics-charts"

// ── Analítica: cómo van las ventas, qué se vende y qué no deja ganancia ──

export function AnalyticsView() {
  const { data, rules } = useKitchen()
  const { now, before, weeks, weekdays, sellers } = analytics(data, rules)
  const avgNow = now.orders ? now.sales / now.orders : 0
  const avgBefore = before.orders ? before.sales / before.orders : 0
  const sold = sellers.filter((s) => s.units > 0)
  const least = sellers.filter((s) => !sold.slice(0, 5).includes(s)).slice(-4).reverse()
  const flagged = data.presentations
    .filter((p) => p.active)
    .map((p) => ({ p, h: presentationHealth(p, rules, data.settings.targetMargin), c: presentationCost(p, rules) }))
    .filter((x) => x.h.kind !== "ok")

  return (
    <>
      <PageHead title="Analítica" sub="Cómo van tus ventas, qué se vende más y qué productos no te dejan ganancia." />
      <Summary now={now} before={before} today={data.today} />
      <div className="grid g4 stats" style={{ marginTop: 16 }}>
        <Stat label="Vendiste" value={money(now.sales)} hint="Últimas 4 semanas, sin domicilios" now={now.sales} before={before.sales} beforeText={money(before.sales)} />
        <Stat
          label="Te quedó de ganancia"
          value={money(now.profit)}
          hint="Ventas menos lo que costó hacerlo (aprox.)"
          now={now.profit}
          before={before.profit}
          beforeText={money(before.profit)}
        />
        <Stat label="Pedidos" value={String(now.orders)} hint="Últimas 4 semanas" now={now.orders} before={before.orders} beforeText={`${before.orders} pedidos`} />
        <Stat label="Cada pedido, en promedio" value={money(avgNow)} hint="Lo que gasta un cliente por pedido" now={avgNow} before={avgBefore} beforeText={money(avgBefore)} />
      </div>
      <div className="grid g2" style={{ marginTop: 16 }}>
        <div className="card">
          <h2>¿Cómo van tus ventas cada semana?</h2>
          <p className="small muted">Plata vendida por semana en las últimas 8 semanas.</p>
          <WeekBars weeks={weeks} today={data.today} />
        </div>
        <div className="card">
          <h2>¿Qué días tienes más trabajo?</h2>
          <p className="small muted">Pedidos por día de producción en las últimas 8 semanas.</p>
          <WeekdayBars counts={weekdays} />
        </div>
        <div className="card">
          <h2>¿Qué es lo que más vendes?</h2>
          <p className="small muted">Las 5 cosas que más plata te dieron en las últimas 8 semanas.</p>
          {sold.length ? <SellerBars list={sold.slice(0, 5)} /> : <Empty>Todavía no hay ventas.</Empty>}
        </div>
        <div className="card">
          <h2>¿Qué casi no se vende?</h2>
          <p className="small muted">Piensa si vale la pena seguir ofreciéndolo, cambiarle el precio o mostrarlo más.</p>
          {least.length ? <SellerBars list={least} warn /> : <Empty>Todo lo que ofreces se está vendiendo.</Empty>}
        </div>
        <div className="card">
          <h2>¿Qué no te deja ganancia?</h2>
          <p className="small muted">Lo que cuesta hacerlo comparado con lo que cobras.</p>
          {flagged.length ? (
            <div className="list">
              {flagged.map((x) => (
                <div className="it" key={x.p.id}>
                  <div>
                    <b>{x.p.name}</b>
                    <div className="small muted">
                      Lo vendes en {money(x.p.price)} y te cuesta {money(x.c)}: {x.p.price >= x.c ? `te quedan ${money(x.p.price - x.c)}` : `pierdes ${money(x.c - x.p.price)}`}.
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span className={`chip ${x.h.kind}`}>{x.h.label}</span>
                    <div className="small" style={{ marginTop: 4, whiteSpace: "nowrap" }}>Cóbralo a <b>{money(x.h.suggested ?? 0)}</b></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty>Todo lo que vendes te deja buena ganancia.</Empty>
          )}
          <p className="small muted" style={{ marginTop: 10 }}>El precio sugerido busca que te quede el {data.settings.targetMargin} % de lo que cobras. Lo cambias en Configuración.</p>
        </div>
      </div>
    </>
  )
}
