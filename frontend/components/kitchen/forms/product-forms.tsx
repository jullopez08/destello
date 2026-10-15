"use client"

import { useState } from "react"
import { Modal, FormError } from "@/components/ui/modal"
import { Cookie } from "@/components/ui/cookie"
import { useKitchen } from "@/lib/kitchen/store"
import type { CookieLook, Product } from "@/lib/kitchen/types"
import { Eyebrow, Field, LinesEditor, Seg, toNumber, useModal } from "../shared"
import type { QtyRow } from "./supply-rows"
import { blankQty, SupplySelect, qtyRows } from "./supply-rows"

// ── Producto: una unidad de lo que se hornea ──

const LOOKS: [CookieLook, string][] = [["", "Clásica"], ["choco", "Chocolate"], ["roll", "Rollo"], ["bread", "Pan"], ["pump", "Calabaza"], ["star", "Dorada"]]

export function ProductForm({ product }: { product?: Product }) {
  const { data, mutate } = useKitchen()
  const { close } = useModal()
  const [name, setName] = useState(product?.name ?? "")
  const [mode, setMode] = useState<Product["mode"]>(product?.mode ?? "LOT")
  const [recipeId, setRecipeId] = useState(product?.recipeId ?? data.recipes[0]?.id ?? "")
  const [g, setG] = useState(product ? String(product.grams) : "")
  const [look, setLook] = useState<CookieLook>(product?.look ?? "")
  const [extras, setExtras] = useState<QtyRow[]>(product?.extras.length ? product.extras.map((e) => ({ supplyId: e.supplyId, qty: String(e.qty) })) : [blankQty()])

  return (
    <Modal
      title={product ? "Editar producto" : "Nuevo producto"}
      sub="Una unidad de lo que horneas, con sus gramos. Si la haces en dos pesos (pequeña y rellena), son dos productos."
      onClose={close}
      onSubmit={async () => {
        const grams_ = toNumber(g)
        if (!name.trim()) throw new FormError("Escribe el nombre.")
        if (!recipeId) throw new FormError("Primero crea una receta en Recetas y masas.")
        if (!(grams_ > 0)) throw new FormError("Escribe los gramos por unidad.")
        const ex = qtyRows(extras)
        if (ex.some((e) => !(e.qty > 0))) throw new FormError("Escribe la cantidad de cada extra.")
        const body = { name: name.trim(), mode, recipeId, grams: grams_, look, extras: ex }
        if (product) await mutate(`/products/${product.id}`, "PUT", body, "Producto actualizado")
        else await mutate("/products", "POST", body, "Producto agregado")
        close()
      }}
    >
      <Field label="Nombre"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Galleta de avena" required /></Field>
      <div>
        <Eyebrow>Cómo se produce</Eyebrow>
        <Seg name="mode" value={mode} onChange={setMode} options={[["LOT", "Con lote de masa"], ["ON_DEMAND", "Solo sobre pedido"]]} />
      </div>
      <div className="fields">
        <Field label="Masa">
          <select value={recipeId} onChange={(e) => setRecipeId(e.target.value)}>
            {data.recipes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </Field>
        <Field label="Gramos por unidad" hint="Solo para la cocina. El cliente no lo ve."><input type="number" min="1" value={g} onChange={(e) => setG(e.target.value)} required /></Field>
      </div>
      <div className="eyebrow">Extras por unidad (capacillo, glaseado…), opcional</div>
      <LinesEditor
        rows={extras}
        setRows={setExtras}
        blank={blankQty}
        addLabel="Agregar extra"
        className="k-extra"
        render={(r, update) => (
          <>
            <SupplySelect value={r.supplyId} onChange={(supplyId) => update({ supplyId })} />
            <input aria-label="Cantidad" type="number" min="0" step="any" placeholder="Cantidad" value={r.qty} onChange={(e) => update({ qty: e.target.value })} />
          </>
        )}
      />
      <div>
        <Eyebrow>Figura</Eyebrow>
        <div className="seg">
          {LOOKS.map(([k, t]) => (
            <label key={k || "classic"}>
              <input type="radio" name="look" checked={look === k} onChange={() => setLook(k)} />
              <span className="row" style={{ gap: 6, display: "inline-flex" }}>
                <Cookie look={k} size={18} />
                {t}
              </span>
            </label>
          ))}
        </div>
      </div>
    </Modal>
  )
}
