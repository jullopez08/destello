"use client"

import { useState } from "react"
import { Modal, FormError } from "@/components/ui/modal"
import { Icon } from "@/components/ui/icon"
import { byId, useKitchen } from "@/lib/kitchen/store"
import { bigUnitOf, factorOf, money, unitOf } from "@/lib/kitchen/format"
import type { SupplyKind } from "@/lib/kitchen/rules"
import type { Supplier, Supply } from "@/lib/kitchen/types"
import { ColorSeg, Eyebrow, Field, LinesEditor, Seg, toNumber, useModal } from "../shared"
import { ConfirmForm } from "./confirm-form"

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
        <Field label="Teléfono o WhatsApp"><input value={f.phone} onChange={(e) => set({ phone: e.target.value })} inputMode="tel" placeholder="300 000 0000" /></Field>
        <Field label="Correo"><input type="email" value={f.email} onChange={(e) => set({ email: e.target.value })} placeholder="ventas@proveedor.co" /></Field>
      </div>
      <Field label="Dirección"><input value={f.address} onChange={(e) => set({ address: e.target.value })} /></Field>
      <div>
        <Eyebrow>Qué le compras</Eyebrow>
        <div className="seg">
          {data.supplies.map((s) => (
            <label key={s.id}>
              <input
                type="checkbox"
                checked={sells.has(s.id)}
                onChange={(e) => {
                  const next = new Set(sells)
                  if (e.target.checked) next.add(s.id)
                  else next.delete(s.id)
                  setSells(next)
                }}
              />
              <span>{s.name}</span>
            </label>
          ))}
        </div>
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
        <Field label="Proveedor">
          <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} required>
            <option value="">Elige un proveedor</option>
            {data.suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
        <Field label="Fecha"><input type="date" value={date} max={data.today} onChange={(e) => setDate(e.target.value)} required /></Field>
      </div>
      <div className="eyebrow">Insumos comprados</div>
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
      <div className="callout c-banana row between">
        <span>Total de la compra</span>
        <b className="num">{money(total)}</b>
      </div>
    </Modal>
  )
}
