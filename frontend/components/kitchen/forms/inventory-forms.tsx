"use client"

import { useState } from "react"
import { Modal, FormError } from "@/components/ui/modal"
import { Icon } from "@/components/ui/icon"
import { useKitchen } from "@/lib/kitchen/store"
import { bigUnitOf, factorOf, longDate, money, phoneInput, phoneProblem } from "@/lib/kitchen/format"
import type { SupplyKind } from "@/lib/kitchen/rules"
import type { Supplier, Supply } from "@/lib/kitchen/types"
import { ColorSeg, Eyebrow, Field, Seg, toNumber, useModal } from "../shared"
import { ConfirmForm, ConfirmSave } from "./confirm-form"
import { SupplyPicker } from "./supply-picker"
import { HELP } from "@/lib/kitchen/help"
import { perishableByDefault } from "@/lib/kitchen/batches"
import { MoneyInput } from "@/components/ui/money-input"

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
        const badPhone = phoneProblem(f.phone, "El teléfono")
        if (badPhone) throw new FormError(badPhone)
        const body = { ...f, supplyIds: [...sells] }
        if (supplier) await mutate(`/suppliers/${supplier.id}`, "PUT", body, "Proveedor actualizado")
        else await mutate("/suppliers", "POST", body, "Proveedor agregado")
        close()
      }}
    >
      <div className="fields">
        <Field label="Nombre del proveedor" help={HELP.supplierName}><input value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder="Ej. Harinas El Trigal" required /></Field>
        <Field label="Persona de contacto" help={HELP.supplierContact}><input value={f.contact} onChange={(e) => set({ contact: e.target.value })} placeholder="Ej. Marta López" /></Field>
        <Field label="Teléfono o WhatsApp" help={HELP.supplierPhone}><input value={f.phone} onChange={(e) => set({ phone: phoneInput(e.target.value) })} inputMode="tel" placeholder="300 000 0000" /></Field>
        <Field label="Correo" help={HELP.supplierEmail}><input type="email" value={f.email} onChange={(e) => set({ email: e.target.value })} placeholder="ventas@proveedor.co" /></Field>
      </div>
      <Field label="Dirección" help={HELP.supplierAddress}><input value={f.address} onChange={(e) => set({ address: e.target.value })} /></Field>
      <div>
        <Eyebrow help={HELP.supplierSells}>Qué le compras</Eyebrow>
        <SupplyPicker value={sells} onChange={setSells} supplierId={supplier?.id} supplierName={f.name.trim() || undefined} />
      </div>
      <Field label="Notas" help={HELP.supplierNotes}><textarea value={f.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Días de entrega, pedido mínimo, descuentos…" /></Field>
      <div>
        <Eyebrow help={HELP.supplierColor}>Color de la tarjeta</Eyebrow>
        <ColorSeg name="color" value={f.color} onChange={(color) => set({ color: color as Supplier["color"] })} />
      </div>
    </Modal>
  )
}

// ── Insumo: existencia y mínimo en kilos, litros o unidades ──

const PER: Record<SupplyKind, string> = { MASS: "kilo", VOLUME: "litro", UNIT: "unidad" }
const MEASURE: Record<SupplyKind, string> = { MASS: "por peso", VOLUME: "por volumen", UNIT: "por unidad" }

/** Pesos con hasta dos centavos, sin formato ("2307.69"), como los guarda MoneyInput. */
const paidText = (n: number) => String(Math.round(n * 100) / 100)

export function SupplyForm({ supply }: { supply?: Supply }) {
  const { data, mutate } = useKitchen()
  const { open, push, close } = useModal()
  const kind0 = supply?.kind ?? "MASS"
  const show = (n: number | undefined, k: SupplyKind) => (n === undefined ? "" : String(Math.round((n / factorOf(k)) * 1000) / 1000))
  const [f, setF] = useState({
    name: supply?.name ?? "",
    kind: kind0 as SupplyKind,
    category: supply?.category ?? "INGREDIENT",
    stock: show(supply?.stock, kind0),
    min: show(supply?.min, kind0),
    // El precio se escribe como se compró (pagaste $ por tanto) y se muestra igual al editar; el costo por
    // gramo, mililitro o unidad lo calcula Destello. Los insumos viejos (sin precio guardado) muestran 1 kg, l o und.
    paid: supply ? paidText(supply.pricePaid ?? supply.cost * factorOf(kind0)) : "",
    paidQty: supply ? (supply.priceQty ? show(supply.priceQty, kind0) : "1") : "",
    supplierId: supply?.supplierId ?? "",
    perishable: supply?.perishable ?? false,
    // Solo al crear: cuándo vence lo que ya tiene (queda como su primer lote).
    expiresOn: "",
  })
  const set = (patch: Partial<typeof f>) => setF((x) => ({ ...x, ...patch }))
  // Al editar, el costo solo cambia si se cambia el precio: si no, se conserva el promedio que dejaron las compras.
  const [start] = useState(f)
  // En un insumo nuevo, «¿Tiene fecha de vencimiento?» sigue al nombre hasta que la dueña lo toque.
  const [auto, setAuto] = useState(!supply)
  const suggest = (name: string, category: Supply["category"]) => (auto ? { perishable: perishableByDefault(name, category) } : {})
  const u = bigUnitOf(f.kind)
  const paid = toNumber(f.paid), paidQty = toNumber(f.paidQty)
  // Precio obligatorio y mayor que cero (Julieth, 2026-10-19): sin él no hay costo ni ganancia.
  const perBig = paid > 0 && paidQty > 0 ? paid / paidQty : null
  // Insumo nuevo: lo que se compró se suma a lo que ya había (Julieth, 2026-10-19). Al editar, el precio no suma nada.
  const before = f.stock.trim() ? toNumber(f.stock) : 0
  const total = supply ? before : before + (paidQty > 0 ? paidQty : 0)
  // Con vencimiento (nuevo, o que pasa a tenerlo) y algo en la cocina: lo que hay necesita su fecha.
  const askDate = f.category === "INGREDIENT" && f.perishable && (!supply || !supply.perishable) && total > 0
  const n = (x: number) => x.toLocaleString("es-CO")
  // Un empaque siempre se cuenta por unidad.
  const pickCategory = (category: "INGREDIENT" | "PACKAGING") => set(category === "PACKAGING" ? { category, kind: "UNIT", perishable: false } : { category, ...suggest(f.name, category) })

  return (
    <Modal
      title={supply ? "Editar insumo" : "Nuevo insumo"}
      sub="Cantidades en kilos, litros o unidades."
      onClose={close}
      onSubmit={async () => {
        // Lo que tienes puede ser 0 (aún no has comprado); el mínimo no: sin él no hay aviso de "bajo".
        const min = toNumber(f.min)
        if (!f.name.trim()) throw new FormError("Escribe el nombre del insumo.")
        if (!(before >= 0)) throw new FormError("Lo que tienes no puede ser negativo.")
        if (!(min > 0)) throw new FormError(`Escribe el mínimo en ${u}: no puede quedar vacío ni en 0.`)
        if (perBig === null) throw new FormError(`Escribe cuánto pagaste y por cuántos ${u}: el precio no puede quedar en 0.`)
        const m = factorOf(f.kind)
        const priceChanged = !supply || f.paid !== start.paid || f.paidQty !== start.paidQty || f.kind !== start.kind
        const cost = priceChanged ? perBig / m : supply.cost
        if (askDate && !f.expiresOn) throw new FormError("Escribe cuándo vence lo que tienes.")
        if (askDate && f.expiresOn < data.today) throw new FormError("Esa fecha ya pasó: lo que tienes está vencido.")
        const body = {
          name: f.name.trim(),
          kind: f.kind,
          category: f.category,
          stock: total * m,
          min: min * m,
          cost,
          pricePaid: paid,
          priceQty: paidQty * m,
          supplierId: f.supplierId || null,
          perishable: f.perishable,
          ...(askDate ? { expiresOn: f.expiresOn } : {}),
        }
        const supplierName = data.suppliers.find((s) => s.id === f.supplierId)?.name ?? "Sin proveedor"
        push(
          <ConfirmSave
            title={supply ? "¿Guardar los cambios?" : "¿Guardar este insumo?"}
            rows={[
              ["Nombre", body.name],
              ["Es", `${f.category === "PACKAGING" ? "Empaque" : "Ingrediente"} · ${MEASURE[f.kind]}`],
              ["Vence", f.perishable ? (askDate ? `Sí · lo que tienes vence el ${longDate(f.expiresOn)}` : "Sí") : "No"],
              ["Lo que tienes", supply ? `${n(total)} ${u}` : `${n(before)} + ${n(paidQty)} comprados = ${n(total)} ${u}`],
              ["Mínimo para alertar", `${n(min)} ${u}`],
              ["Proveedor", supplierName],
              ["Precio", `${money(paid)} por ${n(paidQty)} ${u} (${money(perBig)} por ${PER[f.kind]})`],
            ]}
            onConfirm={() => (supply ? mutate(`/supplies/${supply.id}`, "PUT", body, "Insumo actualizado") : mutate("/supplies", "POST", body, "Insumo agregado"))}
          />,
        )
      }}
    >
      <Field label="Nombre" help={HELP.supplyName}><input value={f.name} onChange={(e) => set({ name: e.target.value, ...suggest(e.target.value, f.category) })} placeholder="Ej. Nueces picadas" required /></Field>
      <div>
        <Eyebrow help={HELP.supplyCategory}>Tipo</Eyebrow>
        <Seg name="category" value={f.category} onChange={pickCategory} options={[["INGREDIENT", "Ingrediente"], ["PACKAGING", "Empaque"]]} />
      </div>
      {f.category === "PACKAGING" ? (
        <p className="small muted">Los empaques se cuentan por unidad.</p>
      ) : (
        <div>
          <Eyebrow help={HELP.supplyKind}>Cómo se mide</Eyebrow>
          <Seg name="kind" value={f.kind} onChange={(kind) => set({ kind })} options={[["MASS", "Por peso"], ["VOLUME", "Por volumen"], ["UNIT", "Por unidad"]]} />
        </div>
      )}
      {f.category === "INGREDIENT" ? (
        <div>
          <Eyebrow help={HELP.supplyPerishable}>¿Tiene fecha de vencimiento?</Eyebrow>
          <Seg
            name="perishable"
            value={f.perishable ? "si" : "no"}
            onChange={(v) => {
              setAuto(false)
              set({ perishable: v === "si" })
            }}
            options={[["no", "No"], ["si", "Sí"]]}
          />
        </div>
      ) : null}
      <div className="fields">
        <Field label={supply ? `Lo que tienes ahora (${u})` : `Lo que tenías antes de esta compra (${u})`} help={HELP.supplyStock} hint={supply ? undefined : "Si no tenías, déjalo en 0."}>
          <input type="number" min="0" step="any" value={f.stock} onChange={(e) => set({ stock: e.target.value })} placeholder={`0 ${u}`} />
        </Field>
        <Field label={`Mínimo para alertar (${u})`} help={HELP.supplyMin} hint="Cuando baje de aquí, Destello te avisa.">
          <input type="number" min="0" step="any" value={f.min} onChange={(e) => set({ min: e.target.value })} placeholder={`Ej. 2 ${u}`} required />
        </Field>
        {askDate ? (
          <Field label={`Lo que tienes (${n(total)} ${u}) vence el`} help={HELP.supplyInitialExpires}>
            <input type="date" min={data.today} value={f.expiresOn} onChange={(e) => set({ expiresOn: e.target.value })} required />
          </Field>
        ) : null}
        <Field label="Proveedor" help={HELP.supplySupplier}>
          <select value={f.supplierId} onChange={(e) => set({ supplierId: e.target.value })}>
            <option value="">Sin proveedor</option>
            {data.suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
      </div>
      <div>
        <Eyebrow>{supply ? "Último precio" : "Esta compra"}</Eyebrow>
        <div className="fields">
          <Field label="Cuánto pagaste en total ($)" help={HELP.supplyPaid}><MoneyInput value={f.paid} onChange={(v) => set({ paid: v })} /></Field>
          <Field label={`Cantidad que compraste (${u})`} help={HELP.supplyPaidQty}><input type="number" min="0" step="any" value={f.paidQty} onChange={(e) => set({ paidQty: e.target.value })} placeholder={f.kind === "UNIT" ? "Ej. 50" : "Ej. 3"} /></Field>
        </div>
        <p className="small muted" style={{ marginTop: 6 }}>
          {perBig === null ? (supply ? "Lo que pagaste la última vez." : "Se suma a lo que tenías.") : `Sale a ${money(perBig)} por ${PER[f.kind]}.${supply ? " Las compras lo van ajustando." : ` Quedas con ${total.toLocaleString("es-CO")} ${u}.`}`}
        </p>
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
