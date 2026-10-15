"use client"

import { Icon } from "@/components/ui/icon"
import { byId, orderTotal, useKitchen } from "@/lib/kitchen/store"
import { dateLabel, money } from "@/lib/kitchen/format"
import type { Order } from "@/lib/kitchen/types"
import { Empty, PageHead, Tabs, useModal } from "../shared"
import { OrderForm, SendForm } from "../forms/order-forms"
import { ConfirmForm } from "../forms/confirm-form"

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
        <button className="btn primary only-desktop" onClick={() => open(<OrderForm />)}>
          <Icon name="plus" />
          Nuevo pedido
        </button>
      </PageHead>
      <button className="fab only-mobile" onClick={() => open(<OrderForm />)}>
        <Icon name="plus" />
        Pedido a mano
      </button>
      <Tabs value={tab} onChange={setTab} options={tabs.map(([k, t]) => [k, `${t} · ${count(k)}`] as [OrderTab, string])} />
      {rows.length ? (
        <div className="tbl cardify">
          <table>
            <thead>
              <tr><th>#</th><th>Cliente</th><th>Productos</th><th>Entrega</th><th>Pago</th><th className="r">Total</th><th>Estado</th><th></th></tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id}>
                  <td className="num muted c-num">{o.number}</td>
                  <td className="c-title">
                    <b>{o.customer}</b>
                    <div className="small muted">{o.phone}</div>
                  </td>
                  <td className="small c-full" data-label="Productos">
                    {o.lines.map((l, i) => (
                      <div key={i}>{l.qty} × {byId(data.presentations, l.presentationId)?.name}</div>
                    ))}
                  </td>
                  <td className="small c-full" data-label="Entrega">
                    {o.delivery === "DELIVERY" ? (
                      <>Domicilio<div className="muted">{o.address}</div></>
                    ) : (
                      "Recoge en cocina"
                    )}
                    <div className="muted">Se produce: {dateLabel(o.productionDate, data.today)}</div>
                  </td>
                  <td data-label="Pago"><span className={`chip ${o.payment === "CASH" ? "banana" : "lilac"}`}>{o.payment === "CASH" ? "Efectivo" : "Transferencia"}</span></td>
                  <td className="r num" data-label="Total">
                    <b>{money(orderTotal(o))}</b>
                    {o.fee ? <div className="small muted">incluye {money(o.fee)} domicilio</div> : null}
                  </td>
                  <td className="c-full" data-label="Estado">{statusChip(o)}</td>
                  <td className="c-actions">{actions(o)}</td>
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
export type { OrderTab }
