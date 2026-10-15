"use client"

import { useState } from "react"
import { Icon } from "@/components/ui/icon"
import { byId, useKitchen } from "@/lib/kitchen/store"
import { QuickSupplyPanel } from "./quick-supply"

// "Qué le compras" del proveedor: lo elegido sale como fichas y para agregar
// se busca escribiendo (primero los que empiezan por esas letras). Si no
// aparece, la última opción crea el insumo con ese nombre.

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim()

export function SupplyPicker({
  value,
  onChange,
  supplierId,
  supplierName,
}: {
  value: Set<string>
  onChange: (next: Set<string>) => void
  supplierId?: string
  supplierName?: string
}) {
  const { data } = useKitchen()
  const [text, setText] = useState("")
  const [creating, setCreating] = useState<string | null>(null)
  const q = norm(text)
  const free = data.supplies.filter((s) => !value.has(s.id))
  const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name)
  const starts = free.filter((s) => q && norm(s.name).startsWith(q)).sort(byName)
  const contains = free.filter((s) => q && !norm(s.name).startsWith(q) && norm(s.name).includes(q)).sort(byName)
  const hits = [...starts, ...contains].slice(0, 6)
  const exact = data.supplies.some((s) => norm(s.name) === q)

  const add = (id: string) => {
    onChange(new Set(value).add(id))
    setText("")
  }
  const remove = (id: string) => {
    const next = new Set(value)
    next.delete(id)
    onChange(next)
  }

  return (
    <div className="picker">
      {value.size ? (
        <div className="row" style={{ gap: 6 }}>
          {[...value].map((id) => (
            <span className="chip accent picked" key={id}>
              {byId(data.supplies, id)?.name}
              <button type="button" aria-label={`Quitar ${byId(data.supplies, id)?.name}`} onClick={() => remove(id)}>
                <Icon name="x" size={14} />
              </button>
            </span>
          ))}
        </div>
      ) : null}
      {creating === null ? (
        <>
          <input
            className="search"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return
              e.preventDefault()
              if (hits[0]) add(hits[0].id)
              else if (q && !exact) setCreating(text.trim())
            }}
            placeholder="Escribe para buscar: azúcar, caja…"
            aria-label="Buscar insumo para agregar"
          />
          {q ? (
            <div className="picker-list" role="listbox" aria-label="Insumos encontrados">
              {hits.map((s) => (
                <button type="button" role="option" aria-selected="false" key={s.id} onClick={() => add(s.id)}>
                  {s.name}
                  <span className="small muted">{s.category === "PACKAGING" ? "Empaque" : "Ingrediente"}</span>
                </button>
              ))}
              {!exact ? (
                <button type="button" className="picker-new" onClick={() => setCreating(text.trim())}>
                  <Icon name="plus" size={16} />
                  Agregar «{text.trim()}» como insumo nuevo
                </button>
              ) : null}
            </div>
          ) : null}
        </>
      ) : (
        <QuickSupplyPanel
          initialName={creating}
          supplierId={supplierId}
          supplierName={supplierName}
          onAdded={(s) => add(s.id)}
          onClose={() => {
            setCreating(null)
            setText("")
          }}
        />
      )}
    </div>
  )
}
