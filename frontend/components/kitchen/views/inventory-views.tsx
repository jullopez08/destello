"use client"

import { Icon } from "@/components/ui/icon"
import { Cookie } from "@/components/ui/cookie"
import { useToast } from "@/components/ui/toast"
import { byId, useKitchen } from "@/lib/kitchen/store"
import { presentationCost, presentationHealth, presentationMargin, productCost, recipeCostPerGram, addDays } from "@/lib/kitchen/rules"
import { costLabel, dateLabel, fmtN, grams, initials, longDate, money, qty } from "@/lib/kitchen/format"
import { Empty, Kpi, PageHead, Tabs, useModal } from "../shared"
import { PurchaseForm, SupplierForm, SupplyForm } from "../forms/inventory-forms"
import { LotForm, PresentationForm, ProductForm, RecipeForm } from "../forms/recipe-forms"
import { ConfirmForm } from "../forms/confirm-form"

// ── Proveedores ──

export function SuppliersView({ query, setQuery }: { query: string; setQuery: (q: string) => void }) {
  const { data } = useKitchen()
  const { open } = useModal()
  const toast = useToast()
  const q = query.toLowerCase()
  const suppliesOf = (id: string) => data.supplies.filter((s) => s.supplierId === id)
  const list = data.suppliers.filter((p) => !q || `${p.name} ${p.contact ?? ""} ${suppliesOf(p.id).map((s) => s.name).join(" ")}`.toLowerCase().includes(q))

  return (
    <>
      <PageHead title="Proveedores" sub="A quién le compras cada insumo y cómo contactarlo.">
        <button className="btn primary" onClick={() => open(<SupplierForm />)}>
          <Icon name="plus" />
          Nuevo proveedor
        </button>
      </PageHead>
      <div className="row" style={{ marginBottom: 16 }}>
        <input className="search" placeholder="Buscar por nombre, contacto o insumo" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Buscar proveedor" />
      </div>
      {list.length ? (
        <div className="grid g3">
          {list.map((p) => {
            const items = suppliesOf(p.id)
            const buys = data.purchases.filter((c) => c.supplierId === p.id)
            const spent = buys.reduce((a, c) => a + c.lines.reduce((x, l) => x + l.total, 0), 0)
            const last = buys.map((c) => c.date).sort().pop()
            return (
              <article className={`card c-${p.color} stack`} style={{ gap: 12 }} key={p.id}>
                <div className="row between nowrap">
                  <div className="row nowrap" style={{ minWidth: 0 }}>
                    <div className="avatar" style={{ background: "var(--surface)" }}>{initials(p.name)}</div>
                    <div style={{ minWidth: 0 }}>
                      <h3 style={{ margin: 0 }}>{p.name}</h3>
                      <div className="small">{p.contact || "Sin contacto"}</div>
                    </div>
                  </div>
                  <div className="row nowrap" style={{ gap: 0 }}>
                    <button className="iconbtn" title="Editar" aria-label={`Editar ${p.name}`} onClick={() => open(<SupplierForm supplier={p} />)}>
                      <Icon name="edit" />
                    </button>
                    <button
                      className="iconbtn"
                      title="Eliminar"
                      aria-label={`Eliminar ${p.name}`}
                      onClick={() =>
                        open(
                          <ConfirmForm
                            title="Eliminar proveedor"
                            text={<>Se eliminará <b>{p.name}</b>. Sus insumos quedarán sin proveedor y las compras se conservan.</>}
                            label="Eliminar"
                            path={`/suppliers/${p.id}`}
                            method="DELETE"
                            done="Proveedor eliminado"
                          />,
                        )
                      }
                    >
                      <Icon name="trash" />
                    </button>
                  </div>
                </div>
                <div className="stack small" style={{ gap: 6 }}>
                  {p.phone ? (
                    <div className="row" style={{ gap: 6 }}>
                      <Icon name="phone" size={16} />
                      <span className="num" style={{ userSelect: "all" }}>{p.phone}</span>
                      <button
                        className="iconbtn"
                        aria-label="Copiar teléfono"
                        onClick={() =>
                          navigator.clipboard
                            ?.writeText(p.phone!)
                            .then(() => toast("Copiado: " + p.phone))
                            .catch(() => toast("Selecciona el número para copiarlo"))
                        }
                      >
                        <Icon name="copy" size={14} />
                      </button>
                    </div>
                  ) : null}
                  {p.email ? (
                    <div className="row nowrap" style={{ gap: 6 }}>
                      <Icon name="mail" size={16} />
                      <span style={{ userSelect: "all", overflowWrap: "anywhere" }}>{p.email}</span>
                    </div>
                  ) : null}
                  {p.address ? (
                    <div className="row nowrap" style={{ gap: 6 }}>
                      <Icon name="pin" size={16} />
                      <span>{p.address}</span>
                    </div>
                  ) : null}
                </div>
                <div className="row" style={{ gap: 6 }}>
                  {items.length ? items.map((s) => <span className="chip white" key={s.id}>{s.name}</span>) : <span className="small muted">Aún no tiene insumos asociados</span>}
                </div>
                {p.notes ? <p className="small" style={{ opacity: 0.85 }}>{p.notes}</p> : null}
                <div className="row between small" style={{ borderTop: "1px dashed rgba(61,36,23,.2)", paddingTop: 10 }}>
                  <span>{last ? "Última compra: " + dateLabel(last, data.today) : "Sin compras"}</span>
                  <b className="num">{money(spent)}</b>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <Empty>{data.suppliers.length ? "No hay proveedores con esa búsqueda." : "Aún no tienes proveedores. Agrega el primero."}</Empty>
      )}
    </>
  )
}

// ── Insumos ──

type SupplyTab = "todos" | "ing" | "emp" | "bajos"

export function SuppliesView({ tab, setTab, query, setQuery }: { tab: SupplyTab; setTab: (t: SupplyTab) => void; query: string; setQuery: (q: string) => void }) {
  const { data } = useKitchen()
  const { open } = useModal()
  const q = query.toLowerCase()
  const list = data.supplies.filter(
    (s) =>
      (tab === "todos" || (tab === "bajos" ? s.stock < s.min : tab === "ing" ? s.category === "INGREDIENT" : s.category === "PACKAGING")) &&
      (!q || s.name.toLowerCase().includes(q)),
  )
  const value = data.supplies.reduce((a, s) => a + Math.max(0, s.stock) * s.cost, 0)

  return (
    <>
      <PageHead title="Insumos" sub="Todo se mide por peso, volumen o unidad. El costo es el promedio de lo que has pagado a todos los proveedores.">
        <button className="btn primary" onClick={() => open(<SupplyForm />)}>
          <Icon name="plus" />
          Nuevo insumo
        </button>
      </PageHead>
      <div className="grid g4" style={{ marginBottom: 16 }}>
        <Kpi v={data.supplies.length} l="Insumos registrados" c="c-banana" />
        <Kpi v={money(value)} l="Valor del inventario" s="a costo promedio" c="c-sky" />
        <Kpi v={data.supplies.filter((s) => s.stock < s.min).length} l="Por debajo del mínimo" c="c-strawberry" />
      </div>
      <div className="row between" style={{ marginBottom: 12 }}>
        <Tabs value={tab} onChange={setTab} style={{ margin: 0 }} options={[["todos", "Todos"], ["ing", "Ingredientes"], ["emp", "Empaques"], ["bajos", "Bajos"]]} />
        <input className="search" placeholder="Buscar insumo" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Buscar insumo" />
      </div>
      {list.length ? (
        <div className="tbl">
          <table>
            <thead>
              <tr><th>Insumo</th><th>Proveedor</th><th>Existencia</th><th className="r">Costo promedio</th><th className="r">Valor</th><th>Estado</th></tr>
            </thead>
            <tbody>
              {list.map((s) => {
                const r = s.min > 0 ? s.stock / s.min : 3
                const k = r < 1 ? "bad" : r < 1.3 ? "warn" : ""
                return (
                  <tr className="click" key={s.id} onClick={() => open(<SupplyForm supply={s} />)} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && open(<SupplyForm supply={s} />)}>
                    <td>
                      <b>{s.name}</b>
                      <div className="small muted">{s.category === "PACKAGING" ? "Empaque" : "Ingrediente"} · mínimo {qty(s.min, s.kind)}</div>
                    </td>
                    <td className="small">{byId(data.suppliers, s.supplierId)?.name ?? "—"}</td>
                    <td>
                      <div className="num" style={{ fontWeight: 700 }}>{qty(s.stock, s.kind)}</div>
                      <div className={`bar ${k}`} style={{ marginTop: 4 }}>
                        <span style={{ width: `${Math.min(100, (r / 3) * 100)}%` }} />
                      </div>
                    </td>
                    <td className="r num">{costLabel(s)}</td>
                    <td className="r num">{money(Math.max(0, s.stock) * s.cost)}</td>
                    <td>{r < 1 ? <span className="chip bad">Comprar ya</span> : r < 1.3 ? <span className="chip warn">Casi en el mínimo</span> : <span className="chip good">Bien</span>}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty>No hay insumos en esta lista.</Empty>
      )}
    </>
  )
}

// ── Compras ──

export function PurchasesView() {
  const { data } = useKitchen()
  const { open } = useModal()
  const month = data.purchases.filter((c) => c.date.slice(0, 7) === data.today.slice(0, 7)).reduce((a, c) => a + c.lines.reduce((x, l) => x + l.total, 0), 0)

  return (
    <>
      <PageHead title="Compras" sub="Al registrar una compra sube la existencia del insumo y se actualiza su costo promedio.">
        <button className="btn primary" onClick={() => open(<PurchaseForm />)}>
          <Icon name="plus" />
          Registrar compra
        </button>
      </PageHead>
      <div className="grid g4" style={{ marginBottom: 16 }}>
        <Kpi v={money(month)} l="Compras del mes" c="c-peach" />
        <Kpi v={data.purchases.length} l="Compras registradas" c="c-lilac" />
      </div>
      {data.purchases.length ? (
        <div className="stack">
          {data.purchases.map((c) => {
            const p = byId(data.suppliers, c.supplierId)
            return (
              <div className="card" key={c.id}>
                <div className="row between">
                  <div className="row">
                    <div className="avatar" style={{ background: `var(--${p?.color ?? "banana"})` }}>{initials(p?.name ?? "?")}</div>
                    <div>
                      <b>{p?.name ?? "Proveedor eliminado"}</b>
                      <div className="small muted">{dateLabel(c.date, data.today)} · {longDate(c.date)}</div>
                    </div>
                  </div>
                  <b className="num">{money(c.lines.reduce((a, l) => a + l.total, 0))}</b>
                </div>
                <div className="row" style={{ marginTop: 12, gap: 6 }}>
                  {c.lines.map((l, i) => {
                    const s = byId(data.supplies, l.supplyId)
                    return (
                      <span className="chip banana" key={i}>
                        {s?.name} · {qty(l.qty, s?.kind)} · {money(l.total)}
                      </span>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <Empty>Aún no hay compras.</Empty>
      )}
    </>
  )
}

// ── Recetas y masas ──

export function RecipesView() {
  const { data } = useKitchen()
  const { open } = useModal()
  const lots = data.lots.filter((l) => l.left > 0)

  return (
    <>
      <PageHead title="Recetas y masas" sub="Cada receta rinde una tanda de masa en gramos. Las galletas se hacen por lote y se guardan; los rollos y panes se hacen solo con pedido.">
        <button className="btn soft" onClick={() => open(<LotForm />)} disabled={!data.recipes.length}>Producir lote de masa</button>
        <button className="btn primary" onClick={() => open(<RecipeForm />)}>
          <Icon name="plus" />
          Nueva receta
        </button>
      </PageHead>
      <h2 style={{ marginBottom: 12 }}>Masa guardada</h2>
      {lots.length ? (
        <div className="grid g3" style={{ marginBottom: 26 }}>
          {lots.map((l) => {
            const r = byId(data.recipes, l.recipeId)
            const soon = l.expiresOn <= addDays(data.today, 1)
            return (
              <div className="card" key={l.id}>
                <div className="row between">
                  <b>{r?.name}</b>
                  {soon ? <span className="chip warn">Usar pronto</span> : <span className="chip good">Fresca</span>}
                </div>
                <div className="kpi" style={{ marginTop: 10 }}>
                  <span className="v">{grams(l.left)}</span>
                  <span className="s">
                    de {grams(l.grams)} · hecha {dateLabel(l.madeOn, data.today).toLowerCase()} · vence {dateLabel(l.expiresOn, data.today).toLowerCase()}
                  </span>
                </div>
                <div className="bar" style={{ marginTop: 10 }}>
                  <span style={{ width: `${(l.left / l.grams) * 100}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <Empty style={{ marginBottom: 26 }}>No hay masa guardada.</Empty>
      )}
      <h2 style={{ marginBottom: 12 }}>Recetas</h2>
      {data.recipes.length ? (
        <div className="grid g3">
          {data.recipes.map((r) => {
            const lot = data.products.some((p) => p.recipeId === r.id && p.mode === "LOT")
            return (
              <article className={`card c-${r.color}`} key={r.id}>
                <div className="row between">
                  <h3 style={{ margin: 0 }}>{r.name}</h3>
                  <button className="iconbtn" aria-label={`Editar ${r.name}`} onClick={() => open(<RecipeForm recipe={r} />)}>
                    <Icon name="edit" />
                  </button>
                </div>
                <div className="row" style={{ margin: "10px 0 12px", gap: 6 }}>
                  <span className="chip white">Rinde {grams(r.yieldGrams)}</span>
                  <span className="chip white">{money(recipeCostPerGram(r, data.supplies) * 1000)} / kg</span>
                  <span className="chip accent">{lot ? "Por lote" : "Sobre pedido"}</span>
                </div>
                <div className="list small">
                  {r.items.map((i) => {
                    const s = byId(data.supplies, i.supplyId)
                    return (
                      <div className="it" style={{ padding: "6px 0", borderColor: "rgba(61,36,23,.15)" }} key={i.supplyId}>
                        <span>{s?.name}</span>
                        <span className="num">{qty(i.qty, s?.kind)}</span>
                      </div>
                    )
                  })}
                </div>
                {lot ? (
                  <button className="btn sm" style={{ marginTop: 12, background: "var(--surface)" }} onClick={() => open(<LotForm recipeId={r.id} />)}>
                    Producir lote
                  </button>
                ) : null}
              </article>
            )
          })}
        </div>
      ) : (
        <Empty>Aún no tienes recetas. Empieza por la masa que más usas.</Empty>
      )}
    </>
  )
}

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
        <div className="tbl">
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
                    <td>
                      <b>{pr.name}</b>
                      {pr.active ? null : <div className="small muted">Pausada</div>}
                    </td>
                    <td className="small">
                      {pr.items.map((i) => `${i.units} ${byId(data.products, i.productId)?.name.toLowerCase() ?? ""}`).join(" + ")}
                      <div className="muted">{pr.pack.map((k) => `${k.qty} ${byId(data.supplies, k.supplyId)?.name.toLowerCase() ?? ""}`).join(", ")}</div>
                    </td>
                    <td className="r num"><b>{money(pr.price)}</b></td>
                    <td className="r num">{money(c)}</td>
                    <td className="r num">{fmtN(presentationMargin(pr, rules) * 100)} %</td>
                    <td>
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

export type { SupplyTab }
