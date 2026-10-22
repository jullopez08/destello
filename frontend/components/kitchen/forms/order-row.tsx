"use client"

import { byId, useKitchen } from "@/lib/kitchen/store"
import { money } from "@/lib/kitchen/format"
import type { Edition, Presentation } from "@/lib/kitchen/types"

// Una línea del pedido. Según cómo se vende lo elegido pide más datos:
// - Por unidad: el sabor y, si hace falta, otro empaque (vale para todo el pedido).
// - Sabor y tamaño: el sabor (con su recargo) y el tamaño.

export type OrderRow = { presentationId: string; qty: string; productId: string; sizeId: string; packSupplyId: string }
export const blankOrderRow = (): OrderRow => ({ presentationId: "", qty: "1", productId: "", sizeId: "", packSupplyId: "" })

const optionLabel = (p: Presentation) =>
  `${p.name} · ${p.kind === "UNIT" ? `${money(p.price)} c/u` : p.kind === "SIZES" ? `desde ${money(p.price)}` : money(p.price)}`

/** Lo de una edición especial solo se ofrece para un día entre sus fechas (como el servidor). */
export const sellableOn = (id: string, editions: Edition[], day: string) => {
  const own = editions.filter((e) => e.presentationIds.includes(id))
  return !own.length || own.some((e) => day >= e.startDate && day <= e.endDate)
}

export function OrderRowPicker({
  row,
  update,
  rows,
  setRows,
  day,
}: {
  row: OrderRow
  update: (patch: Partial<OrderRow>) => void
  rows: OrderRow[]
  setRows: (rows: OrderRow[]) => void
  day: string
}) {
  const { data } = useKitchen()
  const p = byId(data.presentations, row.presentationId)
  const packaging = data.supplies.filter((s) => s.category === "PACKAGING")
  const defaultPack = p?.pack.map((k) => byId(data.supplies, k.supplyId)?.name).filter(Boolean).join(", ")

  // El empaque de un pedido por unidad es uno solo: se cambia en todas sus líneas.
  const setPack = (packSupplyId: string) => setRows(rows.map((r) => (r.presentationId === row.presentationId ? { ...r, packSupplyId } : r)))

  return (
    <>
      <div className="order-pick">
        <select
          aria-label="Qué pidió"
          value={row.presentationId}
          onChange={(e) => {
            const next = byId(data.presentations, e.target.value)
            const same = rows.find((r) => r !== row && r.presentationId === e.target.value)
            update({ presentationId: e.target.value, productId: "", sizeId: next?.sizes[0]?.id ?? "", packSupplyId: same?.packSupplyId ?? "" })
          }}
        >
          <option value="">Elige qué pidió</option>
          {data.presentations.filter((x) => (x.active && sellableOn(x.id, data.editions, day)) || x.id === row.presentationId).map((x) => <option key={x.id} value={x.id}>{optionLabel(x)}</option>)}
        </select>
        {p && p.kind !== "BOX" ? (
          <select aria-label="Sabor" value={row.productId} onChange={(e) => update({ productId: e.target.value })}>
            <option value="">Elige el sabor</option>
            {p.items.map((i) => (
              <option key={i.productId} value={i.productId}>
                {byId(data.products, i.productId)?.name}
                {i.surcharge ? ` (+ ${money(i.surcharge)})` : ""}
              </option>
            ))}
          </select>
        ) : null}
        {p?.kind === "SIZES" ? (
          <select aria-label="Tamaño" value={row.sizeId} onChange={(e) => update({ sizeId: e.target.value })}>
            {p.sizes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}{s.portions ? ` (${s.portions})` : ""} · {money(s.price)}
              </option>
            ))}
          </select>
        ) : null}
        {p?.kind === "UNIT" ? (
          <select aria-label="Empaque" value={row.packSupplyId} onChange={(e) => setPack(e.target.value)}>
            <option value="">Empaque de siempre{defaultPack ? ` (${defaultPack})` : ""}</option>
            {packaging.map((s) => <option key={s.id} value={s.id}>En {s.name.toLowerCase()}</option>)}
          </select>
        ) : null}
      </div>
      <input aria-label="Cantidad" type="number" min="1" step="1" value={row.qty} onChange={(e) => update({ qty: e.target.value })} />
    </>
  )
}
