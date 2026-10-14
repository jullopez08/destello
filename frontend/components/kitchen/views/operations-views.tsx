"use client"

import { Icon } from "@/components/ui/icon"
import { Cookie } from "@/components/ui/cookie"
import { byId, editionSold, orderSubtotal, orderTotal, pendingFor, planFor, useKitchen } from "@/lib/kitchen/store"
import { addDays } from "@/lib/kitchen/rules"
import { dateLabel, fmtN, grams, longDate, money, qty } from "@/lib/kitchen/format"
import type { Order } from "@/lib/kitchen/types"
import { Empty, Kpi, PageHead, Tabs, useModal } from "../shared"
import { OrderForm, SendForm } from "../forms/order-forms"
import { VoiceToggle } from "../voice-listener"
import { ConfirmForm } from "../forms/confirm-form"

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches"
}

// ── Hoy ──

export function TodayView() {
  const { data, rules, act } = useKitchen()
  const { open } = useModal()
  const today = data.today
  const todays = data.orders.filter((o) => o.productionDate === today && o.status !== "CANCELLED")
  const pend = todays.filter((o) => o.status === "PENDING" && !o.produced)
  const plan = planFor(rules, pend)
  const boxes = Object.values(plan.boxes).reduce((a, b) => a + b, 0)
  const low = data.supplies.filter((s) => s.stock < s.min)
  const sales = todays.reduce((a, o) => a + orderSubtotal(o), 0)
  const onWay = data.orders.filter((o) => o.status === "ON_THE_WAY")
  const edition = data.editions.find((e) => e.startDate <= today && e.endDate >= today)

  return (
    <>
      <PageHead title={greeting()} sub={`Así va la cocina hoy, ${longDate(today)}.`}>
        <VoiceToggle />
        <button className="btn primary" onClick={() => open(<OrderForm />)}>
          <Icon name="plus" />
          Nuevo pedido
        </button>
      </PageHead>
      <div className="grid g4">
        <Kpi v={todays.length} l="Pedidos para hoy" s={`${pend.length} por producir`} c="c-accent" />
        <Kpi v={money(sales)} l="Ventas de hoy" s="Sin contar domicilios" c="c-strawberry" />
        <Kpi v={boxes} l="Cajas por armar" s={`${Object.keys(plan.boxes).length} presentaciones`} c="c-lilac" />
        <Kpi v={low.length} l="Insumos bajos" s={low.length ? "Revisa antes de producir" : "Todo en orden"} c="c-peach" />
      </div>
      <div className="grid g2" style={{ marginTop: 16 }}>
        <div className="card">
          <div className="row between">
            <h2>Producción de hoy</h2>
            <a className="btn ghost sm" href="#produccion">Ver lista completa</a>
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
        <div className="card">
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
        <div className="card">
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
                {editionSold(data, edition)} de {edition.cap || "∞"} vendidas · cierra el {dateLabel(edition.endDate, today)}
              </p>
              {edition.cap ? (
                <div className="bar" style={{ marginTop: 8, background: "rgba(255,255,255,.55)" }}>
                  <span style={{ width: `${Math.min(100, (editionSold(data, edition) / edition.cap) * 100)}%` }} />
                </div>
              ) : null}
            </div>
          ) : null}
          <div className="card">
            <h2>En camino</h2>
            {onWay.length ? (
              <div className="list">
                {onWay.map((o) => (
                  <div className="it" key={o.id}>
                    <div>
                      <b>{o.customer}</b>
                      <div className="small muted">
                        Con {byId(data.couriers, o.courierId)?.name ?? "repartidor"} · {o.payment === "CASH" ? "cobra " + money(orderTotal(o)) : "ya pagó"}
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
  return o.lines.map((l) => `${l.qty} × ${byId(data.presentations, l.presentationId)?.name ?? ""}`).join(sep)
}

// ── Pedidos ──

type OrderTab = "pendiente" | "listo" | "camino" | "entregado" | "todos"

function inTab(o: Order, tab: OrderTab) {
  if (tab === "todos") return true
  if (tab === "pendiente") return o.status === "PENDING" && !o.produced
  if (tab === "listo") return o.status === "PENDING" && o.produced
  if (tab === "camino") return o.status === "ON_THE_WAY"
  return o.status === "DELIVERED"
}

export function OrdersView({ tab, setTab }: { tab: OrderTab; setTab: (t: OrderTab) => void }) {
  const { data, act } = useKitchen()
  const { open } = useModal()
  const tabs: [OrderTab, string][] = [["pendiente", "Por producir"], ["listo", "Listos para enviar"], ["camino", "En camino"], ["entregado", "Entregados"], ["todos", "Todos"]]
  const rows = data.orders.filter((o) => inTab(o, tab)).slice(0, 200)
  const count = (k: OrderTab) => data.orders.filter((o) => inTab(o, k)).length

  function statusChip(o: Order) {
    if (o.status === "CANCELLED") return <span className="chip bad">Cancelado</span>
    if (o.status === "DELIVERED") return <span className="chip good">Entregado</span>
    if (o.status === "ON_THE_WAY")
      return (
        <>
          <span className="chip lilac">En camino</span>
          <div className="small muted">{byId(data.couriers, o.courierId)?.name}</div>
        </>
      )
    return o.produced ? <span className="chip banana">Listo para enviar</span> : <span className="chip warn">Por producir</span>
  }

  function actions(o: Order) {
    if (o.status === "PENDING" && o.produced && o.delivery === "PICKUP")
      return <button className="btn soft sm" onClick={() => act(`/orders/${o.id}/deliver`, "POST", undefined, `Pedido #${o.number} entregado`)}>Entregado</button>
    if (o.status === "PENDING" && o.produced) return <button className="btn primary sm" onClick={() => open(<SendForm order={o} />)}>Enviar</button>
    if (o.status === "PENDING")
      return (
        <button
          className="btn ghost sm"
          onClick={() =>
            open(
              <ConfirmForm
                title={`Cancelar pedido #${o.number}`}
                text={<>El pedido de <b>{o.customer}</b> sale de la producción.</>}
                label="Cancelar pedido"
                path={`/orders/${o.id}/cancel`}
                method="POST"
                done="Pedido cancelado"
              />,
            )
          }
        >
          Cancelar
        </button>
      )
    if (o.status === "ON_THE_WAY") return <button className="btn soft sm" onClick={() => act(`/orders/${o.id}/deliver`, "POST", undefined, `Pedido #${o.number} entregado`)}>Entregado</button>
    return null
  }

  return (
    <>
      <PageHead title="Pedidos" sub="Los pedidos llegan por WhatsApp a tu celular. Aquí los registras y sigues su entrega.">
        <button className="btn primary" onClick={() => open(<OrderForm />)}>
          <Icon name="plus" />
          Nuevo pedido
        </button>
      </PageHead>
      <Tabs value={tab} onChange={setTab} options={tabs.map(([k, t]) => [k, `${t} · ${count(k)}`] as [OrderTab, string])} />
      {rows.length ? (
        <div className="tbl">
          <table>
            <thead>
              <tr><th>#</th><th>Cliente</th><th>Productos</th><th>Entrega</th><th>Pago</th><th className="r">Total</th><th>Estado</th><th></th></tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id}>
                  <td className="num muted">{o.number}</td>
                  <td>
                    <b>{o.customer}</b>
                    <div className="small muted">{o.phone}</div>
                  </td>
                  <td className="small">
                    {o.lines.map((l, i) => (
                      <div key={i}>{l.qty} × {byId(data.presentations, l.presentationId)?.name}</div>
                    ))}
                  </td>
                  <td className="small">
                    {o.delivery === "DELIVERY" ? (
                      <>Domicilio<div className="muted">{o.address}</div></>
                    ) : (
                      "Recoge en cocina"
                    )}
                    <div className="muted">Se produce: {dateLabel(o.productionDate, data.today)}</div>
                  </td>
                  <td><span className={`chip ${o.payment === "CASH" ? "banana" : "lilac"}`}>{o.payment === "CASH" ? "Efectivo" : "Transferencia"}</span></td>
                  <td className="r num">
                    <b>{money(orderTotal(o))}</b>
                    {o.fee ? <div className="small muted">incluye {money(o.fee)} domicilio</div> : null}
                  </td>
                  <td>{statusChip(o)}</td>
                  <td>{actions(o)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty>No hay pedidos en esta lista.</Empty>
      )}
    </>
  )
}

// ── Producción del día ──

export function ProductionView({ day, setDay }: { day: string | null; setDay: (d: string) => void }) {
  const { data, rules, act } = useKitchen()
  const today = data.today
  const days = [today, addDays(today, 1)]
  const current = day && days.includes(day) ? day : today
  const orders = data.orders.filter((o) => o.productionDate === current && o.status !== "CANCELLED")
  const pend = pendingFor(data, current)
  const plan = planFor(rules, pend)
  const seen = data.checks[current] ?? {}
  const boxes = Object.entries(plan.boxes)

  return (
    <>
      <PageHead title="Producción del día" sub="Calculada con los pedidos tomados hasta la hora de corte. Primero se usa la masa de los lotes y lo que falta se hace con insumos.">
        {pend.length ? (
          <button className="btn primary" onClick={() => act(`/production/${current}/register`, "POST", undefined, `Producción registrada. ${pend.length} pedidos listos para enviar`)}>
            Registrar producción terminada
          </button>
        ) : null}
      </PageHead>
      <Tabs value={current} onChange={setDay} options={days.map((d) => [d, `${dateLabel(d, today)} · ${longDate(d)}`] as [string, string])} />
      {!pend.length ? (
        <Empty>{orders.length ? "La producción de este día ya está registrada. Los pedidos están listos para enviar." : "Todavía no hay pedidos para este día."}</Empty>
      ) : (
        <>
          <div className="grid g4">
            <Kpi v={pend.length} l="Pedidos" s="por producir" c="c-accent" />
            <Kpi v={boxes.reduce((a, b) => a + b[1], 0)} l="Cajas" s="por armar" c="c-lilac" />
            <Kpi v={Object.values(plan.units).reduce((a, b) => a + b, 0)} l="Unidades" s="galletas, rollos y panes" c="c-strawberry" />
            <Kpi v={grams(plan.doughRows.reduce((a, d) => a + d.toMake, 0))} l="Masa por hacer" s="sin contar lotes" c="c-peach" />
          </div>
          <div className="grid g2" style={{ marginTop: 16 }}>
            <div className="card">
              <h2>Masa</h2>
              <div className="list">
                {plan.doughRows.map((d) => (
                  <div className="it" key={d.recipeId}>
                    <div>
                      <b>{byId(data.recipes, d.recipeId)?.name}</b>
                      <div className="small muted">
                        Necesitas {grams(d.need)}
                        {d.fromLots ? ` · ${grams(d.fromLots)} del lote` : ""}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      {d.toMake > 0 ? (
                        <>
                          <span className="chip warn">Hacer {grams(d.toMake)}</span>
                          <div className="small muted num">{fmtN(d.batches, 2)} tandas</div>
                        </>
                      ) : (
                        <span className="chip ok">Alcanza el lote</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="card">
              <h2>Lista para armar</h2>
              <div>
                {boxes.map(([id, n]) => {
                  const key = "b-" + id
                  const done = !!seen[key]
                  return (
                    <label className={`check${done ? " done" : ""}`} key={id}>
                      <input type="checkbox" checked={done} onChange={(e) => act(`/production/${current}/checks`, "PUT", { key, done: e.target.checked })} />
                      <span>
                        <b className="num">{n} ×</b> {byId(data.presentations, id)?.name}
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>
            <div className="card">
              <h2>Unidades a hornear</h2>
              <div className="list">
                {Object.entries(plan.units).map(([id, n]) => {
                  const p = byId(data.products, id)!
                  return (
                    <div className="it" key={id}>
                      <div className="row">
                        <Cookie look={p.look} size={34} />
                        <b>{p.name}</b>
                      </div>
                      <span className="num">
                        <b>{n}</b> und · {grams(n * p.grams)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="card">
              <h2>Insumos que se usan</h2>
              {plan.shortages.length ? (
                <div className="callout c-strawberry" style={{ marginBottom: 10 }}>
                  <b>No alcanza:</b> {plan.shortages.map((x) => byId(data.supplies, x.supplyId)?.name).join(", ")}. Registra una compra antes de producir.
                </div>
              ) : (
                <div className="callout c-sky" style={{ marginBottom: 10 }}>Hay insumos suficientes para toda la producción.</div>
              )}
              <div className="list">
                {[...plan.supplies].sort((a, b) => b.short - a.short).map((x) => {
                  const s = byId(data.supplies, x.supplyId)!
                  return (
                    <div className="it" key={x.supplyId}>
                      <span>{s.name}</span>
                      <span className="num small">
                        {qty(x.need, s.kind)} de {qty(s.stock, s.kind)} {x.short > 0 ? <span className="chip bad">falta {qty(x.short, s.kind)}</span> : null}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}

export type { OrderTab }
