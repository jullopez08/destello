"use client"

import { Icon } from "@/components/ui/icon"
import { byId, useKitchen } from "@/lib/kitchen/store"
import { costLabel, money, qty } from "@/lib/kitchen/format"
import { Empty, PageHead, Tabs, useModal } from "../shared"
import { SupplyForm } from "../forms/inventory-forms"

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
  // Los conteos van en las pestañas (como en Pedidos): tocar "Bajos" muestra lo que hay que comprar.
  const low = data.supplies.filter((s) => s.stock < s.min).length
  const count = (category: string) => data.supplies.filter((s) => s.category === category).length

  return (
    <>
      <PageHead title="Insumos" sub="Todo se mide por peso, volumen o unidad. El costo es el promedio de lo que has pagado a todos los proveedores.">
        <button className="btn primary" onClick={() => open(<SupplyForm />)}>
          <Icon name="plus" />
          Nuevo insumo
        </button>
      </PageHead>
      <p className="summary-line">
        Tienes <b className="num">{money(value)}</b> en insumos <span className="muted">(a costo promedio)</span>.
      </p>
      <div className="row between" style={{ marginBottom: 12 }}>
        <Tabs value={tab} onChange={setTab} style={{ margin: 0 }} options={[["todos", `Todos · ${data.supplies.length}`], ["ing", `Ingredientes · ${count("INGREDIENT")}`], ["emp", `Empaques · ${count("PACKAGING")}`], ["bajos", `Bajos · ${low}`, low ? "alert" : undefined]]} />
        <input className="search" placeholder="Buscar insumo" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Buscar insumo" />
      </div>
      {list.length ? (
        <div className="tbl cardify">
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
                    <td className="c-title">
                      <b>{s.name}</b>
                      <div className="small muted">{s.category === "PACKAGING" ? "Empaque" : "Ingrediente"} · mínimo {qty(s.min, s.kind)}</div>
                    </td>
                    <td className="small c-full c-last" data-label="Proveedor">{byId(data.suppliers, s.supplierId)?.name ?? "—"}</td>
                    <td className="c-hero" data-label="Existencia">
                      <div className="num" style={{ fontWeight: 700 }}>{qty(s.stock, s.kind)}</div>
                      <div className={`bar ${k}`} style={{ marginTop: 4 }}>
                        <span style={{ width: `${Math.min(100, (r / 3) * 100)}%` }} />
                      </div>
                    </td>
                    <td className="r num" data-label="Costo promedio">{costLabel(s)}</td>
                    <td className="r num" data-label="Valor">{money(Math.max(0, s.stock) * s.cost)}</td>
                    <td className="c-badge" data-label="Estado">{s.min <= 0 ? <span className="chip warn">Ponle un mínimo</span> : r < 1 ? <span className="chip bad">Comprar ya</span> : r < 1.3 ? <span className="chip warn">Casi en el mínimo</span> : <span className="chip good">Bien</span>}</td>
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

export type { SupplyTab }
