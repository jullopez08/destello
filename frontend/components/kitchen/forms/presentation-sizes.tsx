"use client"

import { useKitchen } from "@/lib/kitchen/store"
import { HelpTip, LinesEditor, toNumber } from "../shared"
import { HELP } from "@/lib/kitchen/help"
import { MoneyInput } from "@/components/ui/money-input"

// Tamaños de lo que se vende por sabor y tamaño (tortas, cheesecakes): cada uno
// con sus porciones, su molde, su precio y su empaque. Los gramos de masa por
// molde son opcionales: si quedan vacíos se usan los del producto.

export type SizeRow = { id?: string; name: string; portions: string; mold: string; price: string; grams: string; packSupplyId: string }
export const blankSize = (): SizeRow => ({ name: "", portions: "", mold: "", price: "", grams: "", packSupplyId: "" })

export function sizeRows(rows: SizeRow[]) {
  return rows
    .filter((r) => r.name.trim() || r.price)
    .map((r) => ({
      id: r.id,
      name: r.name.trim(),
      portions: r.portions.trim(),
      mold: r.mold.trim(),
      price: toNumber(r.price) || 0,
      grams: toNumber(r.grams) || 0,
      packSupplyId: r.packSupplyId || null,
    }))
}

export function SizeRows({ rows, setRows }: { rows: SizeRow[]; setRows: (rows: SizeRow[]) => void }) {
  const { data } = useKitchen()
  const packaging = data.supplies.filter((s) => s.category === "PACKAGING").sort((a, b) => a.name.localeCompare(b.name))

  return (
    <>
      <div className="eyebrow">Tamaños (cada uno con su molde y su empaque)<HelpTip text={HELP.saleSizes} /></div>
      <div className="small muted">Cada tamaño con su precio y empaque.</div>
      <LinesEditor
        rows={rows}
        setRows={setRows}
        blank={blankSize}
        addLabel="Agregar tamaño"
        className="k-size"
        render={(r, update) => (
          <>
            <input aria-label="Tamaño" placeholder="Tamaño (Pequeño)" value={r.name} onChange={(e) => update({ name: e.target.value })} />
            <input aria-label="Porciones" placeholder="Porciones (2 a 4)" value={r.portions} onChange={(e) => update({ portions: e.target.value })} />
            <input aria-label="Molde" placeholder="Molde (12 cm)" value={r.mold} onChange={(e) => update({ mold: e.target.value })} />
            <MoneyInput aria-label="Precio" placeholder="Precio 0,00" value={r.price} onChange={(v) => update({ price: v })} />
            <input aria-label="Gramos de masa" type="number" min="0" step="any" placeholder="Gramos de masa (opcional)" value={r.grams} onChange={(e) => update({ grams: e.target.value })} />
            <select aria-label="Empaque" value={r.packSupplyId} onChange={(e) => update({ packSupplyId: e.target.value })}>
              <option value="">Sin empaque</option>
              {packaging.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </>
        )}
      />
    </>
  )
}
