"use client"

import { useState } from "react"
import { Icon } from "@/components/ui/icon"
import { byId, useKitchen } from "@/lib/kitchen/store"
import { useModal } from "../shared"
import { RecipeForm } from "./recipe-forms"

// La masa del producto: se busca escribiendo. Si no existe, «Crear … como masa
// nueva» abre la receta completa encima y al guardarla queda elegida. La masa
// sigue viviendo en Recetas y masas: el producto solo la usa, no la copia.

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim()

export function RecipePicker({ value, onChange, exclude, label = "masa" }: { value: string; onChange: (id: string) => void; exclude?: string; label?: string }) {
  const { data } = useKitchen()
  const { push } = useModal()
  const chosen = byId(data.recipes, value)
  const [text, setText] = useState("")
  const [editing, setEditing] = useState(!chosen)
  // La lista sale como menú del buscador solo mientras se está escribiendo en él.
  const [open, setOpen] = useState(false)
  const q = norm(text)
  const list = data.recipes.filter((r) => r.id !== exclude)
  const hits = [...list.filter((r) => norm(r.name).startsWith(q)), ...list.filter((r) => q && !norm(r.name).startsWith(q) && norm(r.name).includes(q))].slice(0, 6)
  const exact = data.recipes.some((r) => norm(r.name) === q)

  const pick = (id: string) => {
    onChange(id)
    setText("")
    setEditing(false)
  }
  const create = () =>
    push(<RecipeForm initialName={text.trim()} title={`Nueva ${label}`} onCreated={(r) => pick(r.id)} />)

  if (chosen && !editing) {
    return (
      <button type="button" className="picked-value" onClick={() => setEditing(true)} aria-label={`Cambiar ${label}: ${chosen.name}`}>
        <b>{chosen.name}</b>
        <span className="small muted">Cambiar</span>
      </button>
    )
  }

  return (
    <div className="picker">
      <input
        className="search"
        value={text}
        autoFocus={!!chosen}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setOpen(false)
          // Si ya había una y no eligió otra, queda la que estaba.
          if (chosen) setEditing(false)
        }}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== "Enter") return
          e.preventDefault()
          if (q && hits[0]) pick(hits[0].id)
          else if (q && !exact) create()
        }}
        placeholder={`Escribe para buscar la ${label}`}
        aria-label={`Buscar ${label}`}
      />
      {open ? (
        // onMouseDown evita que el buscador pierda el foco antes del clic.
        <div className="picker-list floating" role="listbox" aria-label={`${label} encontradas`} onMouseDown={(e) => e.preventDefault()}>
          {hits.map((r) => (
            <button type="button" role="option" aria-selected={r.id === value} key={r.id} onClick={() => pick(r.id)}>
              {r.name}
            </button>
          ))}
          {!exact ? (
            <button type="button" className="picker-new" onClick={create}>
              <Icon name="plus" size={16} />
              {q ? `Crear «${text.trim()}» como ${label} nueva` : `Crear ${label} nueva`}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
