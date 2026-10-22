"use client"

import { useState } from "react"
import { Modal, FormError } from "@/components/ui/modal"
import { byId, orderSubtotal, orderTotal, pendingFor, useKitchen } from "@/lib/kitchen/store"
import { linePrice, productionPlan } from "@/lib/kitchen/rules"
import { dateLabel, longDate, money, phoneInput, phoneProblem } from "@/lib/kitchen/format"
import type { Order } from "@/lib/kitchen/types"
import { Eyebrow, Field, HelpTip, LinesEditor, Seg, toNumber, useModal } from "../shared"
import { blankOrderRow, OrderRowPicker, type OrderRow } from "./order-row"
import { HELP } from "@/lib/kitchen/help"
import { MoneyInput } from "@/components/ui/money-input"

// ── Pedido a mano (los de WhatsApp los registra la dueña igual) ──

const lineKey = (l: { presentationId: string; productId?: string | null; sizeId?: string | null; packSupplyId?: string | null }) =>
  [l.presentationId, l.productId || "", l.sizeId || "", l.packSupplyId || ""].join("|")

const toRow = (l: Order["lines"][number]): OrderRow => ({
  presentationId: l.presentationId, qty: String(l.qty), productId: l.productId ?? "", sizeId: l.sizeId ?? "", packSupplyId: l.packSupplyId ?? "",
})

/** Nuevo pedido o, con `order`, editarlo antes de producirlo: lo que ya tenía conserva su precio (como el servidor). */
export function OrderForm({ order }: { order?: Order }) {
  const { data, rules, mutate } = useKitchen()
  const { close } = useModal()
  const pd = order?.productionDate ?? data.nextProductionDate
  const [customer, setCustomer] = useState(order?.customer ?? "")
  const [phone, setPhone] = useState(order?.phone ? phoneInput(order.phone) : "")
  const [rows, setRows] = useState<OrderRow[]>(order ? order.lines.map(toRow) : [blankOrderRow()])
  const [delivery, setDelivery] = useState<Order["delivery"]>(order?.delivery ?? "DELIVERY")
  const [payment, setPayment] = useState<Order["payment"]>(order?.payment ?? "TRANSFER")
  const [address, setAddress] = useState(order?.address ?? "")
  const [fee, setFee] = useState(order ? String(order.fee) : "5000")
  const kept = new Map(order?.lines.map((l) => [lineKey(l), l.unitPrice]))

  const lines = rows
    .filter((r) => r.presentationId && toNumber(r.qty) > 0)
    .map((r) => ({ orderId: "nuevo", presentationId: r.presentationId, qty: toNumber(r.qty), productId: r.productId || null, sizeId: r.sizeId || null, packSupplyId: r.packSupplyId || null }))
  const committed = pendingFor(data, pd).filter((o) => o.id !== order?.id).flatMap((o) => o.lines)
  const plan = productionPlan([...committed, ...lines], rules)
  const dom = delivery === "DELIVERY"
  const sub = lines.reduce((sum, l) => {
    const p = byId(data.presentations, l.presentationId)
    return sum + (p ? l.qty * (kept.get(lineKey(l)) ?? linePrice(p, l)) : 0)
  }, 0)
  const feeN = dom ? toNumber(fee) || 0 : 0

  return (
    <Modal
      title={order ? `Editar pedido #${order.number}` : "Nuevo pedido"}
      sub={`Se produce ${dateLabel(pd, data.today).toLowerCase()} (${longDate(pd)}). El domicilio lo cotiza el repartidor.`}
      wide
      onClose={close}
      onSubmit={async () => {
        if (!customer.trim()) throw new FormError("Escribe el nombre del cliente.")
        const chosen = rows.filter((r) => r.presentationId)
        if (!chosen.length || chosen.some((r) => !(toNumber(r.qty) >= 1))) throw new FormError("Agrega al menos un producto con su cantidad.")
        for (const r of chosen) {
          const p = byId(data.presentations, r.presentationId)
          if (p && p.kind !== "BOX" && !r.productId) throw new FormError(`Elige el sabor de "${p.name}".`)
          if (p?.kind === "SIZES" && !r.sizeId) throw new FormError(`Elige el tamaño de "${p.name}".`)
        }
        if (dom && !address.trim()) throw new FormError("Escribe la dirección de entrega.")
        const badPhone = phoneProblem(phone)
        if (badPhone) throw new FormError(badPhone)
        await mutate(
          order ? `/orders/${order.id}` : "/orders",
          order ? "PUT" : "POST",
          {
            customer: customer.trim(),
            phone: phone.trim() || undefined,
            delivery,
            address: dom ? address.trim() : undefined,
            payment,
            fee: Math.round(feeN),
            lines: chosen.map((r) => ({
              presentationId: r.presentationId,
              qty: Math.round(toNumber(r.qty)),
              productId: r.productId || undefined,
              sizeId: r.sizeId || undefined,
              packSupplyId: r.packSupplyId || undefined,
            })),
          },
          order ? `Pedido #${order.number} actualizado` : "Pedido agregado",
        )
        close()
      }}
    >
      <div className="fields">
        <Field label="Cliente" help={HELP.orderCustomer}><input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Nombre" required /></Field>
        <Field label="WhatsApp" help={HELP.orderPhone}><input value={phone} onChange={(e) => setPhone(phoneInput(e.target.value))} inputMode="tel" placeholder="300 000 0000" /></Field>
      </div>
      <div className="eyebrow">Qué pidió<HelpTip text={HELP.orderLines} /></div>
      <LinesEditor
        rows={rows}
        setRows={setRows}
        blank={blankOrderRow}
        addLabel="Agregar producto"
        className="k-order"
        render={(r, update) => <OrderRowPicker row={r} update={update} rows={rows} setRows={setRows} />}
      />
      <div className="fields">
        <div>
          <Eyebrow help={HELP.orderDelivery}>Entrega</Eyebrow>
          <Seg name="delivery" value={delivery} onChange={setDelivery} options={[["DELIVERY", "Domicilio"], ["PICKUP", "Recoge en cocina"]]} />
        </div>
        <div>
          <Eyebrow help={HELP.orderPayment}>Pago</Eyebrow>
          <Seg name="payment" value={payment} onChange={setPayment} options={[["TRANSFER", "Transferencia"], ["CASH", "Efectivo"]]} />
        </div>
      </div>
      {dom ? (
        <div className="fields">
          <Field label="Dirección" help={HELP.orderAddress}><input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Calle, número, apto" /></Field>
          <Field label="Domicilio cotizado ($)" help={HELP.orderFee}><MoneyInput value={fee} onChange={(v) => setFee(v)} /></Field>
        </div>
      ) : null}
      {lines.length ? (
        <>
          <div className={`callout ${plan.shortages.length ? "c-strawberry" : "c-sky"}`}>
            {plan.shortages.length ? (
              <>
                <b>Con los pedidos de ese día no alcanza:</b> {plan.shortages.map((x) => byId(data.supplies, x.supplyId)?.name).join(", ")}.
              </>
            ) : (
              <>
                <b>Se puede hacer.</b> Hay masa o insumos suficientes.
              </>
            )}
          </div>
          <div className="card c-banana" style={{ padding: "14px 16px" }}>
            <div className="row between"><span>Productos</span><span className="num">{money(sub)}</span></div>
            {dom ? <div className="row between"><span>Domicilio</span><span className="num">{money(feeN)}</span></div> : null}
            <div className="row between" style={{ marginTop: 6, fontSize: 18 }}>
              <b>Total para el cliente</b>
              <b className="num">{money(sub + feeN)}</b>
            </div>
            {payment === "CASH" && dom ? (
              <div className="small" style={{ marginTop: 6 }}>
                El repartidor paga {money(sub)} al recoger y cobra {money(sub + feeN)} al cliente.
              </div>
            ) : null}
          </div>
        </>
      ) : null}
    </Modal>
  )
}

// ── Enviar con un repartidor ──

export function SendForm({ order }: { order: Order }) {
  const { data, mutate } = useKitchen()
  const { close } = useModal()
  const [courierId, setCourierId] = useState(data.couriers[0]?.id ?? "")

  return (
    <Modal
      title={`Enviar pedido #${order.number}`}
      sub="Primero se le pregunta al repartidor principal."
      submit="Marcar en camino"
      onClose={close}
      onSubmit={async () => {
        if (!courierId) throw new FormError("Agrega un repartidor en Configuración.")
        await mutate(`/orders/${order.id}/send`, "POST", { courierId }, `Pedido #${order.number} va en camino`)
        close()
      }}
    >
      {data.couriers.length ? (
        <Seg
          name="courier"
          column
          value={courierId}
          onChange={setCourierId}
          options={data.couriers.map((c, i) => [c.id, `${i === 0 ? "Principal · " : ""}${c.name} · ${c.phone}`] as [string, string])}
        />
      ) : (
        <div className="empty">No hay repartidores. Agrégalos en Configuración.</div>
      )}
      <div className="callout c-banana small">
        {order.payment === "CASH" ? (
          <>
            Pago en efectivo: el repartidor paga {money(orderSubtotal(order))} al recoger y cobra <b>{money(orderTotal(order))}</b> al cliente.
          </>
        ) : (
          "Pagado por transferencia: el repartidor no cobra nada."
        )}
      </div>
    </Modal>
  )
}
