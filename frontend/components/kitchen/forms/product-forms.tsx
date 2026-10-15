"use client"

import { useState } from "react"
import { Modal, FormError } from "@/components/ui/modal"
import { Cookie } from "@/components/ui/cookie"
import { Icon } from "@/components/ui/icon"
import { byId, useKitchen } from "@/lib/kitchen/store"
import { unitOf } from "@/lib/kitchen/format"
import type { CookieLook, Product } from "@/lib/kitchen/types"
import { Eyebrow, Field, LinesEditor, Seg, toNumber, useModal } from "../shared"
import { RecipePicker } from "./recipe-picker"
import { RecipeForm } from "./recipe-forms"
import { QuickSupply } from "./quick-supply"

// Extra por unidad: un insumo («s:id», relleno comprado, capacillo) o una
// receta propia («r:id», relleno hecho, en gramos).
type ExtraRow = { ref: string; qty: string }
const blankExtra = (): ExtraRow => ({ ref: "", qty: "" })

// ── Producto: una unidad de lo que se hornea ──

const LOOKS: [CookieLook, string][] = [["", "Clásica"], ["choco", "Chocolate"], ["roll", "Rollo"], ["bread", "Pan"], ["pump", "Calabaza"], ["star", "Dorada"]]

export function ProductForm({ product }: { product?: Product }) {
  const { data, mutate } = useKitchen()
  const { close, push } = useModal()
  const [name, setName] = useState(product?.name ?? "")
  const [mode, setMode] = useState<Product["mode"]>(product?.mode ?? "LOT")
  const [recipeId, setRecipeId] = useState(product?.recipeId ?? "")
  const [g, setG] = useState(product ? String(product.grams) : "")
  const [look, setLook] = useState<CookieLook>(product?.look ?? "")
  const [extras, setExtras] = useState<ExtraRow[]>(
    product?.extras.length ? product.extras.map((e) => ({ ref: e.recipeId ? `r:${e.recipeId}` : `s:${e.supplyId}`, qty: String(e.qty) })) : [blankExtra()],
  )
  // Lo nuevo va en la línea vacía si hay una; si no, en una nueva.
  const addExtra = (ref: string) => {
    const empty = extras.findIndex((x) => !x.ref)
    setExtras(empty >= 0 ? extras.map((x, i) => (i === empty ? { ...x, ref } : x)) : [...extras, { ref, qty: "" }])
  }
  const supplies = [...data.supplies].sort((a, b) => a.name.localeCompare(b.name))
  const fillings = data.recipes.filter((x) => x.id !== recipeId)

  return (
    <Modal
      title={product ? "Editar producto" : "Nuevo producto"}
      sub="Una unidad de lo que horneas, con sus gramos. Si la haces en dos pesos (pequeña y rellena), son dos productos."
      onClose={close}
      onSubmit={async () => {
        const grams_ = toNumber(g)
        if (!name.trim()) throw new FormError("Escribe el nombre.")
        if (!recipeId) throw new FormError("Elige la masa o créala aquí mismo.")
        if (!(grams_ > 0)) throw new FormError("Escribe los gramos por unidad.")
        const ex = extras
          .filter((x) => x.ref)
          .map((x) => ({ [x.ref.startsWith("r:") ? "recipeId" : "supplyId"]: x.ref.slice(2), qty: toNumber(x.qty) }) as { supplyId?: string; recipeId?: string; qty: number })
        if (ex.some((e) => !(e.qty > 0))) throw new FormError("Escribe la cantidad de cada extra.")
        if (ex.some((e) => e.recipeId === recipeId)) throw new FormError("El relleno no puede ser la misma masa del producto.")
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
      <div>
        <Eyebrow>Masa</Eyebrow>
        <RecipePicker value={recipeId} onChange={setRecipeId} />
      </div>
      <Field label="Gramos de masa por unidad" hint="Solo para la cocina. El cliente no lo ve."><input type="number" min="1" value={g} onChange={(e) => setG(e.target.value)} required /></Field>
      <div className="eyebrow">Rellenos y extras por unidad, opcional</div>
      <div className="small muted">Relleno comprado o capacillo: un insumo. Relleno que preparas tú (arequipe, ganache): su receta, en gramos.</div>
      <LinesEditor
        rows={extras}
        setRows={setExtras}
        blank={blankExtra}
        addLabel="Agregar extra"
        className="k-extra"
        render={(x, update) => {
          const unit = x.ref.startsWith("r:") ? "g" : x.ref ? unitOf(byId(data.supplies, x.ref.slice(2))?.kind ?? "UNIT") : ""
          return (
            <>
              <select aria-label="Extra" value={x.ref} onChange={(e) => update({ ref: e.target.value })}>
                <option value="">Elige un relleno o extra</option>
                {fillings.length ? (
                  <optgroup label="Rellenos que preparas (recetas)">
                    {fillings.map((f) => <option key={f.id} value={`r:${f.id}`}>{f.name} (g)</option>)}
                  </optgroup>
                ) : null}
                <optgroup label="Insumos (comprados)">
                  {supplies.map((s) => <option key={s.id} value={`s:${s.id}`}>{s.name} ({unitOf(s.kind)})</option>)}
                </optgroup>
              </select>
              <input aria-label="Cantidad" type="number" min="0" step="any" placeholder={unit ? `Cantidad (${unit})` : "Cantidad"} value={x.qty} onChange={(e) => update({ qty: e.target.value })} />
            </>
          )
        }}
      />
      <div className="row" style={{ gap: 8 }}>
        <button type="button" className="btn soft sm" onClick={() => push(<RecipeForm title="Nuevo relleno" onCreated={(rec) => addExtra(`r:${rec.id}`)} />)}>
          <Icon name="plus" />
          Relleno que preparas
        </button>
      </div>
      <QuickSupply onAdded={(s) => addExtra(`s:${s.id}`)} />
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
