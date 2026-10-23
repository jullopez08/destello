"use client"

import { Icon } from "@/components/ui/icon"
import { Cookie } from "@/components/ui/cookie"
import { byId, editionSold, lineLabel, orderSubtotal, orderTotal, planFor, useKitchen } from "@/lib/kitchen/store"
import { dateLabel, grams, longDate, money, qty } from "@/lib/kitchen/format"
import type { Order } from "@/lib/kitchen/types"
import { Empty, Kpi, PageHead, useModal } from "../shared"
import { OrderForm } from "../forms/order-forms"
import { LotAlerts } from "./lot-alerts"
import { LateOrdersAlert } from "./orders-view"
import { SupplyAlerts } from "./supply-batches-view"
import { useSession } from "@/lib/session"

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches"
}

// ── Hoy ──

export function TodayView() {
  const { data, rules, act } = useKitchen()
  const { open } = useModal()
  const { user } = useSession()
  const firstName = user?.name?.trim().split(/\s+/)[0]
  const today = data.today
  const todays = data.orders.filter((o) => o.productionDate === today && o.status !== "CANCELLED")
  const pend = todays.filter((o) => o.status === "PENDING" && !o.produced)
  const plan = planFor(rules, pend)
  const boxes = Object.values(plan.boxes).reduce((a, b) => a + b, 0)
  // Sin lo vencido (rules.supplies)
  const low = rules.supplies.filter((s) => s.stock < s.min)
  const sales = todays.reduce((a, o) => a + orderSubtotal(o), 0)
  const onWay = data.orders.filter((o) => o.status === "ON_THE_WAY")
  const edition = data.editions.find((e) => e.startDate <= today && e.endDate >= today)

  return (
    <>
      <PageHead title={firstName ? `${greeting()}, ${firstName}` : greeting()} sub={`Así va la cocina hoy, ${longDate(today)}.`}>
        <div className="row only-desktop">
          <button className="btn primary" data-tour="nuevo-pedido" onClick={() => open(<OrderForm />)}>
            <Icon name="plus" />
            Nuevo pedido
          </button>
        </div>
      </PageHead>
      <LateOrdersAlert />
      <LotAlerts />
      <SupplyAlerts />
      <div className="grid g4" data-tour="hoy-cifras">
        <Kpi v={todays.length} l="Pedidos para hoy" s={`${pend.length} por producir`} c="c-accent" href="#pedidos" />
        <Kpi v={money(sales)} l="Ventas de hoy" s="Sin contar domicilios" c="c-strawberry" />
        <Kpi v={boxes} l="Cajas por armar" s={`${Object.keys(plan.boxes).length} presentaciones`} c="c-lilac" href="#produccion" />
        <Kpi v={low.length} l="Insumos bajos" s={low.length ? "Revisa antes de producir" : "Todo en orden"} c="c-peach" href={low.length ? "#insumos/bajos" : undefined} />
      </div>
      <div className="grid g2" style={{ marginTop: 16 }}>
        <div className="card" data-tour="hoy-produccion">
          <div className="row between">
            <h2>Producción de hoy</h2>
            <a className="btn ghost sm" href="#produccion">Ver lista</a>
          </div>
          {plan.doughRows.length ? (
            <div className="list">
              {plan.doughRows.map((d) => (
                <div className="it" key={d.recipeId}>
                  <div>
                    <b>{byId(data.recipes, d.recipeId)?.name}</b>
                    <div className="small muted">
                      Necesitas {grams(d.need)}
                      {d.fromLots ? ` · ${grams(d.fromLots)} salen del lote` : ""}
                    </div>
                  </div>
                  {d.toMake > 0 ? <span className="chip warn">Hacer {grams(d.toMake)}</span> : <span className="chip ok">Alcanza el lote</span>}
                </div>
              ))}
            </div>
          ) : (
            <Empty>No hay nada pendiente por producir hoy.</Empty>
          )}
          {plan.shortages.length ? (
            <div className="callout c-strawberry" style={{ marginTop: 12 }}>
              <b>Falta para producir:</b>{" "}
              {plan.shortages.map((x) => {
                const s = byId(data.supplies, x.supplyId)!
                return `${s.name} (${qty(x.short, s.kind)})`
              }).join(", ")}
            </div>
          ) : null}
        </div>
        <div className="card" data-tour="hoy-pedidos">
          <div className="row between">
            <h2>Pedidos por producir</h2>
            <a className="btn ghost sm" href="#pedidos">Ver pedidos</a>
          </div>
          {pend.length ? (
            <div className="list">
              {pend.map((o) => (
                <div className="it" key={o.id}>
                  <div>
                    <b>{o.customer}</b>
                    <div className="small muted">{orderSummary(data, o, ", ")}</div>
                  </div>
                  <b className="num">{money(orderTotal(o))}</b>
                </div>
              ))}
            </div>
          ) : (
            <Empty>Todo producido.</Empty>
          )}
        </div>
        <div className="card" data-tour="hoy-insumos">
          <h2>Insumos bajos</h2>
          {low.length ? (
            <div className="list">
              {low.map((s) => (
                <div className="it" key={s.id}>
                  <div>
                    <b>{s.name}</b>
                    <div className="small muted">Quedan {qty(s.stock, s.kind)} · mínimo {qty(s.min, s.kind)}</div>
                  </div>
                  <a className="btn soft sm" href="#compras">Comprar</a>
                </div>
              ))}
            </div>
          ) : (
            <Empty>Ningún insumo bajo.</Empty>
          )}
        </div>
        <div className="stack">
          {edition ? (
            <div className={`card c-${edition.color}`}>
              <div className="row">
                <Cookie look={edition.look} size={48} />
                <div>
                  <div className="eyebrow">Edición activa</div>
                  <h2 style={{ margin: "4px 0 0" }}>{edition.name}</h2>
                </div>
              </div>
              <p style={{ marginTop: 12 }}>
                {editionSold(data, edition)} vendidas · cierra el {dateLabel(edition.endDate, today)}
              </p>
            </div>
          ) : null}
          <div className="card" data-tour="hoy-camino">
            <h2>En camino</h2>
            {onWay.length ? (
              <div className="list">
                {onWay.map((o) => (
                  <div className="it" key={o.id}>
                    <div>
                      <b>{o.customer}</b>
                      <div className="small muted">
                        Con {byId(data.couriers, o.courierId)?.name ?? "repartidor"} · {o.payment === "CASH" ? "cobra " + money(orderTotal(o)) : o.paidAt ? "ya pagó" : "pago por verificar"}
                      </div>
                    </div>
                    <button className="btn soft sm" onClick={() => act(`/orders/${o.id}/deliver`, "POST", undefined, `Pedido #${o.number} entregado`)}>
                      Entregado
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <Empty>Nada en camino.</Empty>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

function orderSummary(data: ReturnType<typeof useKitchen>["data"], o: Order, sep: string) {
  return o.lines.map((l) => lineLabel(data, l)).join(sep)
}
