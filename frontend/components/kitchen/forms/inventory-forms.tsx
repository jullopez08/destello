"use client"

import { useState } from "react"
import { Modal, FormError } from "@/components/ui/modal"
import { Icon } from "@/components/ui/icon"
import { useKitchen } from "@/lib/kitchen/store"
import { bigUnitOf, factorOf, phoneInput } from "@/lib/kitchen/format"
import type { SupplyKind } from "@/lib/kitchen/rules"
import type { Supplier, Supply } from "@/lib/kitchen/types"
import { ColorSeg, Eyebrow, Field, Seg, toNumber, useModal } from "../shared"
import { ConfirmForm } from "./confirm-form"
import { SupplyPicker } from "./supply-picker"

// ── Proveedor ──

export function SupplierForm({ supplier }: { supplier?: Supplier }) {
  const { data, mutate } = useKitchen()
  const { close } = useModal()
  const [f, setF] = useState({
    name: supplier?.name ?? "",
    contact: supplier?.contact ?? "",
    phone: supplier?.phone ?? "",
    email: supplier?.email ?? "",
    address: supplier?.address ?? "",
    notes: supplier?.notes ?? "",
    color: supplier?.color ?? "banana",
  })
  const [sells, setSells] = useState<Set<string>>(new Set(supplier ? data.supplies.filter((s) => s.supplierId === supplier.id).map((s) => s.id) : []))
  const set = (patch: Partial<typeof f>) => setF((x) => ({ ...x, ...patch }))

  return (
    <Modal
      title={supplier ? "Editar proveedor" : "Nuevo proveedor"}
      sub="Guarda a quién le compras y cómo contactarlo."
      onClose={close}
      onSubmit={async () => {
        if (!f.name.trim()) throw new FormError("Escribe el nombre del proveedor.")
        const body = { ...f, supplyIds: [...sells] }
        if (supplier) await mutate(`/suppliers/${supplier.id}`, "PUT", body, "Proveedor actualizado")
        else await mutate("/suppliers", "POST", body, "Proveedor agregado")
        close()
      }}
    >
      <div className="fields">
        <Field label="Nombre del proveedor"><input value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder="Ej. Harinas El Trigal" required /></Field>
        <Field label="Persona de contacto"><input value={f.contact} onChange={(e) => set({ contact: e.target.value })} placeholder="Ej. Marta López" /></Field>
        <Field label="Teléfono o WhatsApp"><input value={f.phone} onChange={(e) => set({ phone: phoneInput(e.target.value) })} inputMode="tel" placeholder="300 000 0000" /></Field>
        <Field label="Correo"><input type="email" value={f.email} onChange={(e) => set({ email: e.target.value })} placeholder="ventas@proveedor.co" /></Field>
      </div>
      <Field label="Dirección"><input value={f.address} onChange={(e) => set({ address: e.target.value })} /></Field>
      <div>
        <Eyebrow>Qué le compras</Eyebrow>
        <SupplyPicker value={sells} onChange={setSells} supplierId={supplier?.id} supplierName={f.name.trim() || undefined} />
      </div>
      <Field label="Notas"><textarea value={f.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Días de entrega, pedido mínimo, descuentos…" /></Field>
      <div>
        <Eyebrow>Color de la tarjeta</Eyebrow>
        <ColorSeg name="color" value={f.color} onChange={(color) => set({ color: color as Supplier["color"] })} />
      </div>
    </Modal>
  )
}

// ── Insumo: existencia y mínimo en kilos, litros o unidades ──

const PER: Record<SupplyKind, string> = { MASS: "kilo", VOLUME: "litro", UNIT: "unidad" }

export function SupplyForm({ supply }: { supply?: Supply }) {
  const { data, mutate } = useKitchen()
  const { open, close } = useModal()
  const kind0 = supply?.kind ?? "MASS"
  const show = (n: number | undefined, k: SupplyKind) => (n === undefined ? "" : String(Math.round((n / factorOf(k)) * 1000) / 1000))
  const [f, setF] = useState({
    name: supply?.name ?? "",
    kind: kind0 as SupplyKind,
    category: supply?.category ?? "INGREDIENT",
    stock: show(supply?.stock, kind0),
    min: show(supply?.min, kind0),
    cost: supply ? String(Math.round(supply.cost * factorOf(kind0) * 100) / 100) : "",
    supplierId: supply?.supplierId ?? "",
  })
  const set = (patch: Partial<typeof f>) => setF((x) => ({ ...x, ...patch }))
  const u = bigUnitOf(f.kind)

  return (
    <Modal
      title={supply ? "Editar insumo" : "Nuevo insumo"}
      sub="La existencia y el mínimo se escriben en kilos, litros o unidades."
      onClose={close}
      onSubmit={async () => {
        const stock = toNumber(f.stock), min = toNumber(f.min), cost = toNumber(f.cost)
        if (!f.name.trim()) throw new FormError("Escribe el nombre del insumo.")
        if (![stock, min, cost].every((n) => n >= 0)) throw new FormError("Completa existencia, mínimo y costo con números positivos.")
        const m = factorOf(f.kind)
        const body = { name: f.name.trim(), kind: f.kind, category: f.category, stock: stock * m, min: min * m, cost: cost / m, supplierId: f.supplierId || null }
        if (supply) await mutate(`/supplies/${supply.id}`, "PUT", body, "Insumo actualizado")
        else await mutate("/supplies", "POST", body, "Insumo agregado")
        close()
      }}
    >
      <Field label="Nombre"><input value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder="Ej. Nueces picadas" required /></Field>
      <div>
        <Eyebrow>Cómo se mide</Eyebrow>
        <Seg name="kind" value={f.kind} onChange={(kind) => set({ kind })} options={[["MASS", "Por peso"], ["VOLUME", "Por volumen"], ["UNIT", "Por unidad"]]} />
      </div>
      <div>
        <Eyebrow>Tipo</Eyebrow>
        <Seg name="category" value={f.category} onChange={(category) => set({ category })} options={[["INGREDIENT", "Ingrediente"], ["PACKAGING", "Empaque"]]} />
      </div>
      <div className="fields">
        <Field label={`Existencia actual (${u})`}><input type="number" min="0" step="any" value={f.stock} onChange={(e) => set({ stock: e.target.value })} required /></Field>
        <Field label={`Mínimo para alertar (${u})`}><input type="number" min="0" step="any" value={f.min} onChange={(e) => set({ min: e.target.value })} required /></Field>
        <Field label={`Costo por ${PER[f.kind]} ($)`}><input type="number" min="0" step="any" value={f.cost} onChange={(e) => set({ cost: e.target.value })} required /></Field>
        <Field label="Proveedor">
          <select value={f.supplierId} onChange={(e) => set({ supplierId: e.target.value })}>
            <option value="">Sin proveedor</option>
            {data.suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
      </div>
      {supply ? (
        <div>
          <button
            type="button"
            className="btn ghost sm"
            onClick={() =>
              open(
                <ConfirmForm
                  title="Eliminar insumo"
                  text={<>Se eliminará <b>{supply.name}</b>. Solo se puede si ninguna receta, producto, empaque ni compra lo usa.</>}
                  label="Eliminar"
                  path={`/supplies/${supply.id}`}
                  method="DELETE"
                  done={`${supply.name} eliminado`}
                />,
              )
            }
          >
            <Icon name="trash" />
            Eliminar insumo
          </button>
        </div>
      ) : null}
    </Modal>
  )
}
