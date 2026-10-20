"use client"

import { useState } from "react"
import { Icon } from "@/components/ui/icon"
import { useToast } from "@/components/ui/toast"
import { useKitchen } from "@/lib/kitchen/store"
import { errorMessage } from "@/lib/api"
import type { SupplyKind } from "@/lib/kitchen/rules"
import type { Supply } from "@/lib/kitchen/types"
import { perishableByDefault } from "@/lib/kitchen/batches"
import { factorOf } from "@/lib/kitchen/format"
import { MoneyInput } from "@/components/ui/money-input"
import { Eyebrow, Field, Seg } from "../shared"
import { HELP } from "@/lib/kitchen/help"

// "¿No está? Insumo nuevo" dentro de Receta, Proveedor y Compra: se crea con el
// nombre, cómo se mide y su precio (obligatorio y mayor que cero), sin salir del
// formulario. La existencia y el mínimo quedan en 0: la primera compra la llena y
// en Insumos sale «Ponle un mínimo». Va dentro de otro <form>, así que no es un form propio.

type Added = { supplierId?: string; supplierName?: string; onAdded: (supply: Supply) => void }

// Botón «¿No está? Insumo nuevo» que abre el recuadro (en Compra).
export function QuickSupply(props: Added) {
  const [shown, setShown] = useState(false)
  if (shown) return <QuickSupplyPanel {...props} onClose={() => setShown(false)} />
  return (
    <button type="button" className="btn soft sm quick-open" onClick={() => setShown(true)}>
      <Icon name="plus" />
      ¿No está? Insumo nuevo
    </button>
  )
}

// El recuadro. Al agregar se cierra solo (onClose).
export function QuickSupplyPanel({ supplierId, supplierName, onAdded, onClose, initialName = "" }: Added & { onClose: () => void; initialName?: string }) {
  const { data, mutate } = useKitchen()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [name, setName] = useState(initialName)
  const [kind, setKind] = useState<SupplyKind>("MASS")
  const [category, setCategory] = useState<"INGREDIENT" | "PACKAGING">("INGREDIENT")
  const [price, setPrice] = useState("")
  // Sigue al nombre (casi todo ingrediente vence) hasta que la dueña lo toque.
  const [chosen, setChosen] = useState<boolean | null>(null)
  const perishable = chosen ?? perishableByDefault(name, category)
  // Un empaque siempre se cuenta por unidad.
  const pickCategory = (c: "INGREDIENT" | "PACKAGING") => {
    setCategory(c)
    if (c === "PACKAGING") setKind("UNIT")
  }

  async function add() {
    const clean = name.trim()
    if (!clean) return setError("Escribe el nombre del insumo.")
    if (data.supplies.some((s) => s.name.toLowerCase() === clean.toLowerCase())) return setError(`Ya tienes «${clean}». Búscalo en la lista.`)
    const perBig = Number(price)
    if (!(perBig > 0)) return setError("Escribe el precio: no puede quedar en 0.")
    const measure = category === "PACKAGING" ? "UNIT" : kind
    setBusy(true)
    setError("")
    try {
      const before = new Set(data.supplies.map((s) => s.id))
      const next = await mutate("/supplies", "POST", { name: clean, kind: measure, category, stock: 0, min: 0, cost: perBig / factorOf(measure), pricePaid: perBig, priceQty: factorOf(measure), supplierId: supplierId || null, perishable: category === "INGREDIENT" && perishable })
      const added = next.supplies.find((s) => !before.has(s.id))
      toast(`${clean} agregado`)
      if (added) onAdded(added)
      onClose()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="quick card" role="group" aria-label="Insumo nuevo">
      <div className="row between nowrap">
        <div>
          <b>Insumo nuevo</b>
          {supplierName ? <div className="small muted">Se agrega a lo que le compras a {supplierName}.</div> : null}
        </div>
        <button type="button" className="iconbtn" aria-label="Cerrar insumo nuevo" onClick={onClose}>
          <Icon name="x" />
        </button>
      </div>
      <Field label="Nombre" help={HELP.supplyName}>
        <input
          value={name}
          autoFocus
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            // Enter no debe guardar el formulario de afuera.
            if (e.key === "Enter") {
              e.preventDefault()
              void add()
            }
          }}
          placeholder="Ej. Nueces de macadamia"
        />
      </Field>
      <div>
        <Eyebrow help={HELP.supplyCategory}>Es un</Eyebrow>
        <Seg name="quick-category" value={category} onChange={pickCategory} options={[["INGREDIENT", "Ingrediente"], ["PACKAGING", "Empaque"]]} />
      </div>
      {category === "PACKAGING" ? (
        <p className="small muted">Los empaques se cuentan por unidad.</p>
      ) : (
        <div>
          <Eyebrow help={HELP.supplyKind}>¿Cómo se mide?</Eyebrow>
          <Seg name="quick-kind" value={kind} onChange={setKind} options={[["MASS", "Peso (kg)"], ["VOLUME", "Volumen (L)"], ["UNIT", "Unidad"]]} />
        </div>
      )}
      {category === "INGREDIENT" ? (
        <div>
          <Eyebrow help={HELP.supplyPerishable}>¿Tiene fecha de vencimiento?</Eyebrow>
          <Seg name="quick-perishable" value={perishable ? "si" : "no"} onChange={(v) => setChosen(v === "si")} options={[["no", "No"], ["si", "Sí"]]} />
        </div>
      ) : null}
      <Field label={`Precio por ${category === "PACKAGING" || kind === "UNIT" ? "unidad" : kind === "MASS" ? "kilo" : "litro"} ($)`} help={HELP.supplyQuickPrice}>
        <MoneyInput value={price} onChange={setPrice} />
      </Field>
      {error ? <div className="err" role="alert">{error}</div> : null}
      <button type="button" className="btn primary" disabled={busy} onClick={() => void add()}>
        {busy ? "Agregando…" : "Agregar insumo"}
      </button>
    </div>
  )
}
