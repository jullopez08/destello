"use client"

import { Icon } from "@/components/ui/icon"
import { HELP } from "@/lib/kitchen/help"
import { Cookie } from "@/components/ui/cookie"
import { byId, useKitchen } from "@/lib/kitchen/store"
import { presentationCost, presentationHealth, presentationMargin, productCost, taxIn } from "@/lib/kitchen/rules"
import { fmtN, grams, money, taxName } from "@/lib/kitchen/format"
import { Empty, PageHead, useModal } from "../shared"
import { ProductForm } from "../forms/product-forms"
import { PresentationForm } from "../forms/presentation-form"
import type { KitchenSnapshot, Presentation } from "@/lib/kitchen/types"

// ── Productos y lo que se vende ──

const KIND_LABEL = { BOX: "Caja armada", UNIT: "Por unidad", SIZES: "Sabor y tamaño" } as const

const lower = (s: string | undefined) => s?.toLowerCase() ?? ""
const supplyName = (data: KitchenSnapshot, id: string | null) => lower(byId(data.supplies, id)?.name)

// Qué lleva y en qué empaque va, según cómo se vende.
function contents(data: KitchenSnapshot, pr: Presentation): [string, string] {
  const product = (id: string) => byId(data.products, id)?.name ?? ""
  const pack = pr.pack.map((k) => `${k.qty} ${supplyName(data, k.supplyId)}`).join(", ")
  if (pr.kind === "UNIT") return [`Sabores: ${pr.items.map((i) => product(i.productId)).join(", ")}`, pack ? `Empaque de siempre: ${pack}` : "Sin empaque"]
  if (pr.kind === "SIZES") {
    const flavors = pr.items.map((i) => `${product(i.productId)}${i.surcharge ? ` (+ ${money(i.surcharge)})` : ""}`).join(", ")
    const sizes = pr.sizes.map((s) => `${s.name} ${money(s.price)}${s.packSupplyId ? ` en ${supplyName(data, s.packSupplyId)}` : ""}`).join(" · ")
    return [`Sabores: ${flavors}`, sizes]
  }
  return [pr.items.map((i) => `${i.units} ${lower(product(i.productId))}`).join(" + "), pack]
}

const priceLabel = (pr: Presentation) => (pr.kind === "UNIT" ? `${money(pr.price)} c/u` : pr.kind === "SIZES" ? `Desde ${money(pr.price)}` : money(pr.price))

export function ProductsView() {
  const { data, rules } = useKitchen()
  const { open } = useModal()

  return (
    <>
      <PageHead title="Productos y lo que vendes" sub="Lo que horneas y cómo lo vendes." help={HELP.pageProducts}>
        <button className="btn soft" onClick={() => open(<ProductForm />)} disabled={!data.recipes.length}>Nuevo producto</button>
        <button className="btn primary" onClick={() => open(<PresentationForm />)} disabled={!data.products.length}>
          <Icon name="plus" />
          Nuevo: lo que vendes
        </button>
      </PageHead>
      {data.products.length ? (
        <div className="grid g4" style={{ marginBottom: 26 }}>
          {data.products.map((p) => {
            const r = byId(data.recipes, p.recipeId)
            return (
              <button type="button" className="card product-tile" key={p.id} onClick={() => open(<ProductForm product={p} />)}>
                <Cookie look={p.look} size={56} />
                <b>{p.name}</b>
                <span className="small muted">{grams(p.grams)} de {r?.name.replace(/^Masa de /, "masa de ")}</span>
                <span className="product-tile-foot">
                  <span className={`chip ${p.mode === "LOT" ? "banana" : "lilac"}`}>{p.mode === "LOT" ? "Con lote de masa" : "Solo sobre pedido"}</span>
                  <span className="small num">Costo <b>{money(productCost(p, rules))}</b></span>
                </span>
              </button>
            )
          })}
        </div>
      ) : (
        <Empty style={{ marginBottom: 26 }}>{data.recipes.length ? "Aún no tienes productos." : "Primero crea una receta en Recetas y masas."}</Empty>
      )}
      <h2 style={{ marginBottom: 12 }}>Lo que se vende</h2>
      {data.presentations.length ? (
        <div className="tbl cardify">
          <table>
            <thead>
              <tr><th>Lo que vendes</th><th>Qué lleva</th><th className="r">Precio</th><th className="r">Costo</th><th className="r">Margen</th><th>Estado</th></tr>
            </thead>
            <tbody>
              {data.presentations.map((pr) => {
                const c = presentationCost(pr, rules)
                const h = presentationHealth(pr, rules, data.settings.targetMargin)
                const [main, sub] = contents(data, pr)
                return (
                  <tr className="click" key={pr.id} onClick={() => open(<PresentationForm presentation={pr} />)} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && open(<PresentationForm presentation={pr} />)}>
                    <td className="c-title">
                      <b>{pr.name}</b>
                      <div className="small muted">{KIND_LABEL[pr.kind]}{pr.active ? "" : " · Pausada"}</div>
                    </td>
                    <td className="small c-full c-first">
                      {main}
                      <div className="muted">{sub}</div>
                    </td>
                    <td className="r num c-hero" data-label="Precio">
                      <b>{priceLabel(pr)}</b>
                      {rules.taxRate ? <div className="small muted">Incluye {money(taxIn(pr.price, rules.taxRate))} de {taxName(rules.taxRate)}</div> : null}
                    </td>
                    <td className="r num" data-label="Costo">{money(c)}</td>
                    <td className="r num" data-label="Margen">{fmtN(presentationMargin(pr, rules) * 100)} %</td>
                    <td className="c-badge" data-label="Estado">
                      <span className={`chip ${h.kind === "ok" ? "good" : h.kind}`}>{h.label}</span>
                      {h.suggested ? <div className="small muted" style={{ marginTop: 4 }}>Sugerido {money(h.suggested)}</div> : null}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty>Aún no tienes nada para vender.</Empty>
      )}
    </>
  )
}
