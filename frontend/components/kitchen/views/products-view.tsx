"use client"

import { Icon } from "@/components/ui/icon"
import { Cookie } from "@/components/ui/cookie"
import { byId, useKitchen } from "@/lib/kitchen/store"
import { presentationCost, presentationHealth, presentationMargin, productCost } from "@/lib/kitchen/rules"
import { fmtN, grams, money } from "@/lib/kitchen/format"
import { Empty, PageHead, useModal } from "../shared"
import { PresentationForm, ProductForm } from "../forms/product-forms"

// ── Productos y cajas ──

export function ProductsView() {
  const { data, rules } = useKitchen()
  const { open } = useModal()

  return (
    <>
      <PageHead title="Productos y cajas" sub="El producto dice cuántos gramos de masa lleva cada unidad. La caja es lo que se vende y descuenta su empaque.">
        <button className="btn soft" onClick={() => open(<ProductForm />)} disabled={!data.recipes.length}>Nuevo producto</button>
        <button className="btn primary" onClick={() => open(<PresentationForm />)} disabled={!data.products.length}>
          <Icon name="plus" />
          Nueva caja o presentación
        </button>
      </PageHead>
      {data.products.length ? (
        <div className="grid g4" style={{ marginBottom: 26 }}>
          {data.products.map((p) => {
            const r = byId(data.recipes, p.recipeId)
            return (
              <button type="button" className="card" key={p.id} onClick={() => open(<ProductForm product={p} />)} style={{ textAlign: "left", cursor: "pointer", font: "inherit" }}>
                <div className="row nowrap">
                  <Cookie look={p.look} />
                  <div style={{ minWidth: 0 }}>
                    <b>{p.name}</b>
                    <div className="small muted">{grams(p.grams)} de {r?.name.replace(/^Masa de /, "masa de ")}</div>
                  </div>
                </div>
                <div className="row between" style={{ marginTop: 12 }}>
                  <span className={`chip ${p.mode === "LOT" ? "banana" : "lilac"}`}>{p.mode === "LOT" ? "Con lote de masa" : "Solo sobre pedido"}</span>
                  <span className="small num">Costo {money(productCost(p, rules))}</span>
                </div>
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
              <tr><th>Presentación</th><th>Contenido</th><th className="r">Precio</th><th className="r">Costo</th><th className="r">Margen</th><th>Estado</th></tr>
            </thead>
            <tbody>
              {data.presentations.map((pr) => {
                const c = presentationCost(pr, rules)
                const h = presentationHealth(pr, rules, data.settings.targetMargin)
                return (
                  <tr className="click" key={pr.id} onClick={() => open(<PresentationForm presentation={pr} />)} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && open(<PresentationForm presentation={pr} />)}>
                    <td className="c-title">
                      <b>{pr.name}</b>
                      {pr.active ? null : <div className="small muted">Pausada</div>}
                    </td>
                    <td className="small c-full" data-label="Contenido">
                      {pr.items.map((i) => `${i.units} ${byId(data.products, i.productId)?.name.toLowerCase() ?? ""}`).join(" + ")}
                      <div className="muted">{pr.pack.map((k) => `${k.qty} ${byId(data.supplies, k.supplyId)?.name.toLowerCase() ?? ""}`).join(", ")}</div>
                    </td>
                    <td className="r num" data-label="Precio"><b>{money(pr.price)}</b></td>
                    <td className="r num" data-label="Costo">{money(c)}</td>
                    <td className="r num" data-label="Margen">{fmtN(presentationMargin(pr, rules) * 100)} %</td>
                    <td data-label="Estado">
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
        <Empty>Aún no tienes cajas ni presentaciones para vender.</Empty>
      )}
    </>
  )
}
