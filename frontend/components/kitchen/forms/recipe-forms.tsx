"use client"

import { useState } from "react"
import { Modal, FormError } from "@/components/ui/modal"
import { byId, useKitchen } from "@/lib/kitchen/store"
import { consumedAmount, recipeCostPerGram } from "@/lib/kitchen/rules"
import { grams, money, qty } from "@/lib/kitchen/format"
import type { Recipe } from "@/lib/kitchen/types"
import { ColorSeg, Eyebrow, Field, LinesEditor, toNumber, useModal } from "../shared"
import type { QtyRow } from "./supply-rows"
import { blankQty, SupplySelect, qtyRows } from "./supply-rows"

// ── Receta: ingredientes de una tanda y cuántos gramos de masa rinde ──

// Desde el producto se abre encima con el nombre ya escrito; al guardar,
// onCreated recibe la receta nueva para dejarla elegida.
export function RecipeForm({ recipe, initialName = "", title, onCreated }: { recipe?: Recipe; initialName?: string; title?: string; onCreated?: (recipe: Recipe) => void }) {
  const { data, mutate } = useKitchen()
  const { close } = useModal()
  const [name, setName] = useState(recipe?.name ?? initialName)
  const [yieldGrams, setYield] = useState(recipe ? String(recipe.yieldGrams) : "")
  const [color, setColor] = useState<string>(recipe?.color ?? "banana")
  const [rows, setRows] = useState<QtyRow[]>(recipe?.items.map((i) => ({ supplyId: i.supplyId, qty: String(i.qty) })) ?? [blankQty()])
  const items = qtyRows(rows).filter((i) => i.qty > 0)
  const y = toNumber(yieldGrams)
  const costPerKg = items.length && y > 0 ? money(recipeCostPerGram({ items, yieldGrams: y }, data.supplies) * 1000) + " por kg" : "—"

  return (
    <Modal
      title={recipe ? "Editar receta" : (title ?? "Nueva receta")}
      sub="Ingredientes de una tanda y cuántos gramos de masa rinde."
      wide
      onClose={close}
      onSubmit={async () => {
        const all = qtyRows(rows)
        if (!name.trim()) throw new FormError("Escribe el nombre de la receta.")
        if (!(y > 0)) throw new FormError("Escribe cuántos gramos rinde.")
        if (!all.length || all.some((i) => !(i.qty > 0))) throw new FormError("Agrega los ingredientes con su cantidad.")
        const body = { name: name.trim(), yieldGrams: y, color, items: all }
        if (recipe) await mutate(`/recipes/${recipe.id}`, "PUT", body, "Receta actualizada")
        else {
          const before = new Set(data.recipes.map((x) => x.id))
          const next = await mutate("/recipes", "POST", body, "Receta agregada")
          const added = next.recipes.find((x) => !before.has(x.id))
          if (added) onCreated?.(added)
        }
        close()
      }}
    >
      <div className="fields">
        <Field label="Nombre"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Masa de avena y pasas" required /></Field>
        <Field label="Rinde (gramos de masa)"><input type="number" min="1" value={yieldGrams} onChange={(e) => setYield(e.target.value)} required /></Field>
      </div>
      <div className="eyebrow">Ingredientes por tanda (g, ml o und)</div>
      <LinesEditor
        rows={rows}
        setRows={setRows}
        blank={blankQty}
        addLabel="Agregar ingrediente"
        className="k-recipe"
        render={(r, update) => (
          <>
            <SupplySelect value={r.supplyId} onChange={(supplyId) => update({ supplyId })} />
            <input aria-label="Cantidad" type="number" min="0" step="any" placeholder="Cantidad" value={r.qty} onChange={(e) => update({ qty: e.target.value })} />
          </>
        )}
      />
      <div className="callout c-banana row between">
        <span>Costo de la masa</span>
        <b className="num">{costPerKg}</b>
      </div>
      <div>
        <Eyebrow>Color</Eyebrow>
        <ColorSeg name="color" value={color} onChange={setColor} />
      </div>
    </Modal>
  )
}

// ── Lote de masa: descuenta insumos y guarda la masa para los próximos pedidos ──

export function LotForm({ recipeId }: { recipeId?: string }) {
  const { data, mutate } = useKitchen()
  const { close } = useModal()
  const lotRecipes = data.recipes.filter((r) => data.products.some((p) => p.recipeId === r.id && p.mode === "LOT"))
  const list = lotRecipes.length ? lotRecipes : data.recipes
  const [rid, setRid] = useState(recipeId ?? list[0]?.id ?? "")
  const [batches, setBatches] = useState("1")
  const [days, setDays] = useState("4")
  const recipe = byId(data.recipes, rid)
  const b = toNumber(batches) || 0

  return (
    <Modal
      title="Producir lote de masa"
      sub="Descuenta los insumos y guarda la masa para usarla en los próximos pedidos."
      onClose={close}
      onSubmit={async () => {
        if (!recipe) throw new FormError("Elige la receta.")
        if (!(b > 0)) throw new FormError("Escribe cuántas tandas.")
        await mutate("/lots", "POST", { recipeId: recipe.id, batches: b, days: Number(days) || 4 }, `Lote guardado: ${grams(recipe.yieldGrams * b)} de ${recipe.name.toLowerCase()}`)
        close()
      }}
    >
      <div className="fields">
        <Field label="Receta">
          <select value={rid} onChange={(e) => setRid(e.target.value)}>
            {list.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </Field>
        <Field label="Tandas"><input type="number" min="0.25" step="0.25" value={batches} onChange={(e) => setBatches(e.target.value)} /></Field>
        <Field label="Días que dura"><input type="number" min="1" value={days} onChange={(e) => setDays(e.target.value)} /></Field>
      </div>
      {recipe ? (
        <div>
          <div className="callout c-banana"><b>Salen {grams(recipe.yieldGrams * b)} de masa.</b></div>
          <div className="list small" style={{ marginTop: 10 }}>
            {recipe.items.map((i) => {
              const s = byId(data.supplies, i.supplyId)!
              const n = i.qty * b
              const short = consumedAmount(s.kind, n) > s.stock + 1e-9
              return (
                <div className="it" key={i.supplyId}>
                  <span>{s.name}</span>
                  <span className="num">
                    {qty(n, s.kind)} {short ? <span className="chip bad">solo hay {qty(s.stock, s.kind)}</span> : null}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      ) : null}
    </Modal>
  )
}
