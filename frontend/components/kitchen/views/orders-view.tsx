"use client"

import { ReportButton } from "../report-button"
import { Icon } from "@/components/ui/icon"
import { HELP } from "@/lib/kitchen/help"
import { byId, lineLabel, orderTotal, useKitchen } from "@/lib/kitchen/store"
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

// Atrasado (Julieth, 2026-10-22): su día de producción pasó y no se produjo. Sale en rojo, primero, para revisar qué pasó.
export const isLate = (o: Order, today: string) => o.status === "PENDING" && !o.produced && o.productionDate < today

// Estado del pago (Julieth, 2026-10-22): la transferencia queda por verificar hasta "Pago recibido"; el efectivo
// se recibe solo al recoger o al salir con el repartidor (como el servidor).
export function payState(o: Order): { label: string; tone: string; sub?: string } {
  const method = o.payment === "CASH" ? "Efectivo" : "Transferencia"
  if (o.status === "CANCELLED") return { label: method, tone: "" }
  if (o.paidAt) return { label: "Recibido", tone: "good", sub: method }
  if (o.payment === "TRANSFER") return { label: "Por verificar", tone: "warn", sub: method }
  return o.delivery === "PICKUP" ? { label: "Paga al recoger", tone: "banana" } : { label: "Efectivo", tone: "banana", sub: "Lo paga el repartidor" }
}

// Aviso de Hoy con los pedidos atrasados.
export function LateOrdersAlert() {
  const { data } = useKitchen()
  const late = data.orders.filter((o) => isLate(o, data.today)).length
  if (!late) return null
  return (
    <div className="lot-alerts" role="group" aria-label="Pedidos atrasados">
      <div className="callout c-strawberry lot-alert">
        <span>
          Tienes <b>{late === 1 ? "1 pedido atrasado" : `${late} pedidos atrasados`}</b>: su día de producción ya pasó.
        </span>
        <a className="btn soft sm" href="#pedidos">Revisar</a>
      </div>
    </div>
  )
}

export function OrdersView({ tab, setTab }: { tab: OrderTab; setTab: (t: OrderTab) => void }) {
  const { data, act } = useKitchen()
  const { open } = useModal()
  const tabs: [OrderTab, string][] = [["pendiente", "Por producir"], ["listo", "Listos para enviar"], ["camino", "En camino"], ["entregado", "Entregados"], ["todos", "Todos"]]
  const late = (o: Order) => isLate(o, data.today)
  const rows = data.orders.filter((o) => inTab(o, tab)).sort((a, b) => Number(late(b)) - Number(late(a))).slice(0, 200)
  const lateCount = data.orders.filter(late).length
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
    if (o.produced) return <span className="chip banana">Listo para enviar</span>
    return late(o) ? <span className="chip bad">Atrasado</span> : <span className="chip warn">Por producir</span>
  }

  function actions(o: Order) {
    const pay =
      o.payment === "TRANSFER" && !o.paidAt && o.status !== "CANCELLED" ? (
        <button
          className="btn soft sm"
          onClick={() =>
            open(
              <ConfirmForm
                title={`Pago del pedido #${o.number}`}
                text={<>Revisa en tu banco que llegaron <b>{money(orderTotal(o))}</b> de {o.customer}.</>}
                label="Sí, ya llegó"
                path={`/orders/${o.id}/paid`}
                method="POST"
                done={`Pago del pedido #${o.number} recibido`}
              />,
            )
          }
        >
          Pago recibido
        </button>
      ) : null
    const step = stepActions(o)
    return pay || step ? <>{pay}{step}</> : null
  }

  function stepActions(o: Order) {
    if (o.status === "PENDING" && o.produced && o.delivery === "PICKUP")
      return <button className="btn soft sm" onClick={() => act(`/orders/${o.id}/deliver`, "POST", undefined, `Pedido #${o.number} entregado`)}>Entregado</button>
    if (o.status === "PENDING" && o.produced) return <button className="btn primary sm" onClick={() => open(<SendForm order={o} />)}>Enviar</button>
    if (o.status === "PENDING")
      return (
        <>
          <button className="btn soft sm" onClick={() => open(<OrderForm order={o} />)}>{late(o) ? "Cambiar el día" : "Editar"}</button>
          {late(o) ? (
            <button
              className="btn soft sm"
              onClick={() =>
                open(
                  <ConfirmForm
                    title={`Pedido #${o.number} ya entregado`}
                    text={<>Se hizo y salió sin registrarlo. Se descuentan los insumos, la masa y el empaque que lleva, y queda <b>entregado</b>.</>}
                    label="Ya se entregó"
                    path={`/orders/${o.id}/delivered-late`}
                    method="POST"
                    done={`Pedido #${o.number} entregado`}
                  />,
                )
              }
            >
              Ya se entregó
            </button>
          ) : null}
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
        </>
      )
    if (o.status === "ON_THE_WAY") return <button className="btn soft sm" onClick={() => act(`/orders/${o.id}/deliver`, "POST", undefined, `Pedido #${o.number} entregado`)}>Entregado</button>
    return null
  }

  return (
    <>
      <PageHead title="Pedidos" sub="Registra tus pedidos y sigue su entrega." help={HELP.pageOrders}>
        <ReportButton kind="pedidos" />
        <button className="btn primary only-desktop" data-tour="nuevo-pedido" onClick={() => open(<OrderForm />)}>
          <Icon name="plus" />
          Nuevo pedido
        </button>
      </PageHead>
      <button className="fab only-mobile" data-tour="nuevo-pedido" onClick={() => open(<OrderForm />)}>
        <Icon name="plus" />
        Pedido a mano
      </button>
      <Tabs value={tab} onChange={setTab} options={tabs.map(([k, t]) => [k, `${t} · ${count(k)}`, k === "pendiente" && lateCount ? "alert" : undefined] as [OrderTab, string, string?])} />
      {rows.length ? (
        <div className="tbl cardify">
          <table>
            <thead>
              <tr><th>#</th><th>Cliente</th><th>Productos</th><th>Entrega</th><th>Pago</th><th className="r">Total</th><th>Estado</th><th></th></tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id} className={late(o) ? "late" : undefined}>
                  <td className="num muted c-num">{o.number}</td>
                  <td className="c-title">
                    <b>{o.customer}</b>
                    <div className="small muted">{o.phone}</div>
                  </td>
                  <td className="small c-full">
                    {o.lines.map((l, i) => (
                      <div key={i}>{lineLabel(data, l)}</div>
                    ))}
                  </td>
                  <td className="small c-full c-soft">
                    {o.delivery === "DELIVERY" ? (
                      <>Domicilio<div className="muted">{o.address}</div></>
                    ) : (
                      "Recoge en cocina"
                    )}
                    {late(o) ? (
                      <div className="late-text">Debía producirse: {dateLabel(o.productionDate, data.today)}</div>
                    ) : (
                      <div className="muted">Se produce: {dateLabel(o.productionDate, data.today)}</div>
                    )}
                  </td>
                  <td data-label="Pago">
                    {payState(o).tone ? <span className={`chip ${payState(o).tone}`}>{payState(o).label}</span> : <span className="small muted">{payState(o).label}</span>}
                    {payState(o).sub ? <div className="small muted">{payState(o).sub}</div> : null}
                  </td>
                  <td className="r num c-end" data-label="Total">
                    <b>{money(orderTotal(o))}</b>
                    {o.fee ? <div className="small muted">incluye {money(o.fee)} domicilio</div> : null}
                  </td>
                  <td className="c-badge" data-label="Estado">{statusChip(o)}</td>
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
