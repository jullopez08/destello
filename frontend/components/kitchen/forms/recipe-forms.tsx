"use client"

import { useState } from "react"
import { Modal, FormError } from "@/components/ui/modal"
import { Cookie } from "@/components/ui/cookie"
import { byId, useKitchen } from "@/lib/kitchen/store"
import { consumedAmount, presentationCost, presentationHealth, presentationMargin, recipeCostPerGram } from "@/lib/kitchen/rules"
import { fmtN, grams, money, qty, unitOf } from "@/lib/kitchen/format"
import type { CookieLook, Presentation, Product, Recipe } from "@/lib/kitchen/types"
import { ColorSeg, Eyebrow, Field, LinesEditor, Seg, toNumber, useModal } from "../shared"

type QtyRow = { supplyId: string; qty: string }
const blankQty = (): QtyRow => ({ supplyId: "", qty: "" })

function SupplySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
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

function qtyRows(rows: QtyRow[]) {
  return rows.filter((r) => r.supplyId).map((r) => ({ supplyId: r.supplyId, qty: toNumber(r.qty) }))
}

// ── Receta: ingredientes de una tanda y cuántos gramos de masa rinde ──

export function RecipeForm({ recipe }: { recipe?: Recipe }) {
  const { data, mutate } = useKitchen()
  const { close } = useModal()
  const [name, setName] = useState(recipe?.name ?? "")
  const [yieldGrams, setYield] = useState(recipe ? String(recipe.yieldGrams) : "")
  const [color, setColor] = useState<string>(recipe?.color ?? "banana")
  const [rows, setRows] = useState<QtyRow[]>(recipe?.items.map((i) => ({ supplyId: i.supplyId, qty: String(i.qty) })) ?? [blankQty()])
  const items = qtyRows(rows).filter((i) => i.qty > 0)
  const y = toNumber(yieldGrams)
  const costPerKg = items.length && y > 0 ? money(recipeCostPerGram({ items, yieldGrams: y }, data.supplies) * 1000) + " por kg" : "—"

  return (
    <Modal
      title={recipe ? "Editar receta" : "Nueva receta"}
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
        else await mutate("/recipes", "POST", body, "Receta agregada")
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
      sub="Una unidad de lo que horneas, con los gramos de masa que lleva."
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

// ── Caja o presentación: lo que el cliente compra ──

type ItemRow = { productId: string; units: string }

export function PresentationForm({ presentation }: { presentation?: Presentation }) {
  const { data, rules, mutate } = useKitchen()
  const { close } = useModal()
  const [name, setName] = useState(presentation?.name ?? "")
  const [price, setPrice] = useState(presentation ? String(presentation.price) : "")
  const [active, setActive] = useState(presentation?.active ?? true)
  const [items, setItems] = useState<ItemRow[]>(presentation?.items.map((i) => ({ productId: i.productId, units: String(i.units) })) ?? [{ productId: "", units: "" }])
  const [pack, setPack] = useState<QtyRow[]>(presentation?.pack.length ? presentation.pack.map((p) => ({ supplyId: p.supplyId, qty: String(p.qty) })) : [blankQty()])

  const tmp = {
    price: toNumber(price) || 0,
    items: items.filter((i) => i.productId && toNumber(i.units) > 0).map((i) => ({ productId: i.productId, units: toNumber(i.units) })),
    pack: qtyRows(pack).filter((p) => p.qty > 0),
  }
  const cost = presentationCost(tmp, rules)
  const health = presentationHealth(tmp, rules, data.settings.targetMargin)
  const dough = tmp.items.reduce((sum, i) => sum + i.units * (byId(data.products, i.productId)?.grams ?? 0), 0)
  const tone = health.kind === "ok" ? "c-sky" : health.kind === "warn" ? "c-peach" : "c-strawberry"

  return (
    <Modal
      title={presentation ? "Editar presentación" : "Nueva caja o presentación"}
      sub="Lo que el cliente compra: qué lleva, en qué empaque y a qué precio."
      wide
      onClose={close}
      onSubmit={async () => {
        const p = toNumber(price)
        const its = items.filter((i) => i.productId)
        if (!name.trim()) throw new FormError("Escribe el nombre.")
        if (!(p > 0)) throw new FormError("Escribe el precio.")
        if (!its.length || its.some((i) => !(toNumber(i.units) >= 1))) throw new FormError("Agrega qué productos lleva y cuántas unidades.")
        const body = {
          name: name.trim(),
          price: Math.round(p),
          active,
          items: its.map((i) => ({ productId: i.productId, units: Math.round(toNumber(i.units)) })),
          pack: tmp.pack,
        }
        if (presentation) await mutate(`/presentations/${presentation.id}`, "PUT", body, "Presentación actualizada")
        else await mutate("/presentations", "POST", body, "Presentación agregada")
        close()
      }}
    >
      <div className="fields">
        <Field label="Nombre"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Caja x12 surtida" required /></Field>
        <Field label="Precio de venta ($)"><input type="number" min="0" step="500" value={price} onChange={(e) => setPrice(e.target.value)} required /></Field>
      </div>
      <div className="eyebrow">Qué lleva</div>
      <LinesEditor
        rows={items}
        setRows={setItems}
        blank={() => ({ productId: "", units: "" })}
        addLabel="Agregar producto"
        className="k-items"
        render={(r, update) => (
          <>
            <select aria-label="Producto" value={r.productId} onChange={(e) => update({ productId: e.target.value })}>
              <option value="">Elige un producto</option>
              {data.products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input aria-label="Unidades" type="number" min="1" step="1" placeholder="Unidades" value={r.units} onChange={(e) => update({ units: e.target.value })} />
          </>
        )}
      />
      <div className="eyebrow">Empaque (se descuenta por unidad)</div>
      <LinesEditor
        rows={pack}
        setRows={setPack}
        blank={blankQty}
        addLabel="Agregar empaque"
        className="k-pack"
        render={(r, update) => (
          <>
            <SupplySelect value={r.supplyId} onChange={(supplyId) => update({ supplyId })} />
            <input aria-label="Cantidad" type="number" min="0" step="any" placeholder="Cantidad" value={r.qty} onChange={(e) => update({ qty: e.target.value })} />
          </>
        )}
      />
      <label className="row small" style={{ gap: 8 }}>
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} style={{ width: 18, height: 18, accentColor: "var(--accent-deep)" }} />
        Disponible para la venta
      </label>
      {tmp.items.length ? (
        <div className={`callout ${tone}`}>
          <div className="row between">
            <span>
              Lleva {grams(dough)} de masa · cuesta <b className="num">{money(cost)}</b>
            </span>
            {tmp.price ? <span className={`chip ${health.kind}`}>{health.label} · {fmtN(presentationMargin(tmp, rules) * 100)} %</span> : null}
          </div>
          {health.suggested && tmp.price ? (
            <div className="small" style={{ marginTop: 6 }}>
              Precio sugerido: <b>{money(health.suggested)}</b>
            </div>
          ) : null}
        </div>
      ) : null}
    </Modal>
  )
}
