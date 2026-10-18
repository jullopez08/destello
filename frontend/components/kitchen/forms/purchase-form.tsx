"use client"

import { useState } from "react"
import { Modal, FormError } from "@/components/ui/modal"
import { byId, useKitchen } from "@/lib/kitchen/store"
import { bigUnitOf, money, unitOf } from "@/lib/kitchen/format"
import type { SupplyKind } from "@/lib/kitchen/rules"
import { Field, HelpTip, LinesEditor, toNumber, useModal } from "../shared"
import { QuickSupply } from "./quick-supply"
import { HELP } from "@/lib/kitchen/help"

// ── Compra: sube la existencia y recalcula el costo promedio ──

const UNIT_F: Record<string, [SupplyKind, number]> = { kg: ["MASS", 1000], g: ["MASS", 1], l: ["VOLUME", 1000], ml: ["VOLUME", 1], und: ["UNIT", 1] }
type PurchaseRow = { supplyId: string; qty: string; unit: string; total: string }
const blankPurchase = (): PurchaseRow => ({ supplyId: "", qty: "", unit: "kg", total: "" })

export function PurchaseForm() {
  const { data, mutate } = useKitchen()
  const { close } = useModal()
  const [supplierId, setSupplierId] = useState("")
  const [date, setDate] = useState(data.today)
  const [rows, setRows] = useState<PurchaseRow[]>([blankPurchase()])
  const total = rows.reduce((sum, r) => sum + (toNumber(r.total) || 0), 0)
  const supplies = [...data.supplies].sort((a, b) => a.name.localeCompare(b.name))

  return (
    <Modal
      title="Registrar compra"
      sub="Escribe lo que compraste y cuánto pagaste por cada insumo."
      wide
      onClose={close}
      onSubmit={async () => {
        if (!supplierId) throw new FormError("Elige el proveedor.")
        const lines = rows.filter((r) => r.supplyId)
        if (!lines.length) throw new FormError("Agrega al menos un insumo.")
        const out = lines.map((r) => {
          const s = byId(data.supplies, r.supplyId)!
          const [k, m] = UNIT_F[r.unit]
          const q = toNumber(r.qty), t = toNumber(r.total)
          if (!(q > 0) || !(t >= 0)) throw new FormError(`Escribe cantidad y total de ${s.name}.`)
          if (k !== s.kind) throw new FormError(`${s.name} se mide en ${unitOf(s.kind)}. Cambia la unidad.`)
          return { supplyId: s.id, qty: q * m, total: Math.round(t) }
        })
        await mutate("/purchases", "POST", { supplierId, date, lines: out }, "Compra registrada. Existencias actualizadas")
        close()
      }}
    >
      <div className="fields">
        <Field label="Proveedor" help={HELP.purchaseSupplier}>
          <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} required>
            <option value="">Elige un proveedor</option>
            {data.suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
        <Field label="Fecha" help={HELP.purchaseDate}><input type="date" value={date} max={data.today} onChange={(e) => setDate(e.target.value)} required /></Field>
      </div>
      <div className="eyebrow">Insumos comprados<HelpTip text={HELP.purchaseLines} /></div>
      <LinesEditor
        rows={rows}
        setRows={setRows}
        blank={blankPurchase}
        addLabel="Agregar insumo"
        className="k-purchase"
        render={(r, update) => (
          <>
            <select
              aria-label="Insumo"
              value={r.supplyId}
              onChange={(e) => {
                const s = byId(data.supplies, e.target.value)
                update({ supplyId: e.target.value, unit: s ? bigUnitOf(s.kind) : r.unit })
              }}
            >
              <option value="">Elige un insumo</option>
              {supplies.map((s) => <option key={s.id} value={s.id}>{s.name} ({unitOf(s.kind)})</option>)}
            </select>
            <input aria-label="Cantidad" type="number" min="0" step="any" placeholder="Cantidad" value={r.qty} onChange={(e) => update({ qty: e.target.value })} />
            <select aria-label="Unidad" value={r.unit} onChange={(e) => update({ unit: e.target.value })}>
              {Object.keys(UNIT_F).map((u) => <option key={u}>{u}</option>)}
            </select>
            <input aria-label="Total pagado" type="number" min="0" step="100" placeholder="Total $" value={r.total} onChange={(e) => update({ total: e.target.value })} />
          </>
        )}
      />
      <QuickSupply
        supplierId={supplierId}
        supplierName={byId(data.suppliers, supplierId)?.name}
        onAdded={(s) => {
          // Va en la línea vacía si hay una; si no, en una nueva.
          const row = { ...blankPurchase(), supplyId: s.id, unit: bigUnitOf(s.kind) }
          const empty = rows.findIndex((r) => !r.supplyId)
          setRows(empty >= 0 ? rows.map((r, i) => (i === empty ? { ...r, ...row, qty: r.qty, total: r.total } : r)) : [...rows, row])
        }}
      />
      <div className="callout c-banana row between">
        <span>Total de la compra</span>
        <b className="num">{money(total)}</b>
      </div>
    </Modal>
  )
}
