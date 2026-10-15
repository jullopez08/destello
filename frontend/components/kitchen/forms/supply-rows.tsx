"use client"

import { useKitchen } from "@/lib/kitchen/store"
import { unitOf } from "@/lib/kitchen/format"
import { toNumber } from "../shared"

export type QtyRow = { supplyId: string; qty: string }
export const blankQty = (): QtyRow => ({ supplyId: "", qty: "" })

export function SupplySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { data } = useKitchen()
  return (
    <select aria-label="Insumo" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Elige un insumo</option>
      {[...data.supplies].sort((a, b) => a.name.localeCompare(b.name)).map((s) => (
        <option key={s.id} value={s.id}>
          {s.name} ({unitOf(s.kind)})
        </option>
      ))}
    </select>
  )
}

export function qtyRows(rows: QtyRow[]) {
  return rows.filter((r) => r.supplyId).map((r) => ({ supplyId: r.supplyId, qty: toNumber(r.qty) }))
}
