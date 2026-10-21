"use client"

import { useKitchen } from "@/lib/kitchen/store"
import { netPrice, presentationCost, presentationHealth } from "@/lib/kitchen/rules"
import { analytics } from "@/lib/kitchen/analytics"
import { money } from "@/lib/kitchen/format"
import { Empty, PageHead } from "../shared"
import { Stat, Summary, WeekdayBars } from "./analytics-charts"
import { WeekLine } from "./analytics-line"
import { SellerPie } from "./analytics-pie"
import { WasteCard } from "./analytics-dough"
import { WaiterCard } from "./analytics-waiters"
import { DishTimeCard } from "./analytics-dish-times"

// ── Analítica: cómo van las ventas, qué se vende y qué no deja ganancia ──

export function AnalyticsView() {
  const { data, rules } = useKitchen()
  const { now, before, weeks, weekdays, sellers } = analytics(data, rules)
  // Con mesas, lo cobrado en mesas cuenta como venta junto a los pedidos.
  const tables = data.settings.servesTables
  const avgNow = now.orders ? now.sales / now.orders : 0
  const avgBefore = before.orders ? before.sales / before.orders : 0
  // Si todo se vendiera igual, cada cosa dejaría `fair` de la plata. Lo que
  // deja menos de la mitad de eso es «lo que casi no se vende»; lo demás, lo que se vende.
  const fair = sellers.length ? 1 / sellers.length : 0
  const sold = sellers.filter((s) => s.sales > 0 && s.share >= fair / 2)
  const least = sellers.filter((s) => s.share < fair / 2).reverse()
  const flagged = data.presentations
    .filter((p) => p.active)
    .map((p) => ({ p, h: presentationHealth(p, rules, data.settings.targetMargin), c: presentationCost(p, rules), net: netPrice(p.price, rules.taxRate) }))
    .filter((x) => x.h.kind !== "ok")

  return (
    <>
      <PageHead title="Analítica" sub="Tus ventas, lo más vendido y tu ganancia." />
      <Summary now={now} before={before} today={data.today} tables={tables} />
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
        <Stat label={tables ? "Cada venta, en promedio" : "Cada pedido, en promedio"} value={money(avgNow)} hint={tables ? "Lo que deja un pedido o una mesa" : "Lo que gasta un cliente por pedido"} now={avgNow} before={avgBefore} beforeText={money(avgBefore)} />
      </div>
      <div className="grid g2" style={{ marginTop: 16 }}>
        <div className="card">
          <h2>¿Cómo van tus ventas cada semana?</h2>
          <p className="small muted">Últimas 8 semanas.</p>
          <WeekLine weeks={weeks} today={data.today} />
        </div>
        <div className="card">
          <h2>¿Qué días tienes más trabajo?</h2>
          <p className="small muted">{tables ? "Pedidos y mesas" : "Pedidos"} por día, últimas 8 semanas.</p>
          <WeekdayBars counts={weekdays} />
        </div>
        <div className="card">
          <h2>¿Qué vendes más y qué casi no?</h2>
          <p className="small muted">Últimas 8 semanas.</p>
          {sold.length ? <SellerPie list={sold} max={9} /> : <Empty>Todavía no hay ventas.</Empty>}
          {sold.length ? (
            <p className="conclusion">
              <b>{sold[0].name}</b> es lo que más vendes: deja el <b>{Math.round(sold[0].share * 100)}&nbsp;%</b> de tu plata.
            </p>
          ) : null}
          {least.some((x) => x.sales > 0) ? (
            <p className="conclusion">
              Casi no se venden: <b>{least.filter((x) => x.sales > 0).map((x) => `${x.name} (${x.units})`).join(", ")}</b>. Muéstralos más o cámbialos.
            </p>
          ) : null}
          {least.some((x) => x.sales === 0) ? (
            <p className="conclusion">
              Sin ninguna venta en 8 semanas: <b>{least.filter((x) => x.sales === 0).map((x) => x.name).join(", ")}</b>.
            </p>
          ) : null}
        </div>
        <div className="card">
          <h2>¿Qué no te deja ganancia?</h2>
          <p className="small muted">Lo que te cuesta frente a lo que cobras.</p>
          {flagged.length ? (
            <div className="list">
              {flagged.map((x) => (
                <div className="it noprofit" key={x.p.id}>
                  <div>
                    <b>{x.p.name}</b>
                    <div className="small muted">
                      Lo vendes en {money(x.p.price)} y te cuesta {money(x.c)}: {x.net >= x.c ? `te quedan ${money(x.net - x.c)}` : `pierdes ${money(x.c - x.net)}`}{rules.taxRate ? ", sin el impuesto" : ""}.
                    </div>
                  </div>
                  <div className="fix">
                    <span className={`chip ${x.h.kind}`}>{x.h.label}</span>
                    <div className="small" style={{ whiteSpace: "nowrap" }}>Cóbralo a <b>{money(x.h.suggested ?? 0)}</b></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty>Todo lo que vendes te deja buena ganancia.</Empty>
          )}
          <p className="small muted" style={{ marginTop: 10 }}>Precio sugerido para ganar el {data.settings.targetMargin} %.</p>
        </div>
        <WasteCard />
        {tables ? <DishTimeCard data={data} /> : null}
        {tables ? <WaiterCard waiters={data.waiters} /> : null}
      </div>
    </>
  )
}
