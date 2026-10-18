"use client"

import { useState } from "react"
import { Modal, FormError } from "@/components/ui/modal"
import { byId, useKitchen } from "@/lib/kitchen/store"
import { addDays } from "@/lib/kitchen/rules"
import type { CookieLook, Edition } from "@/lib/kitchen/types"
import { ColorSeg, Eyebrow, Field, Seg, useModal } from "../shared"
import { HELP } from "@/lib/kitchen/help"

// ── Edición especial ──

export function EditionForm() {
  const { data, mutate } = useKitchen()
  const { close } = useModal()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [startDate, setStart] = useState(data.today)
  const [endDate, setEnd] = useState(addDays(data.today, 14))
  const [color, setColor] = useState("strawberry")
  const [look, setLook] = useState<CookieLook>("star")
  const [pres, setPres] = useState<Set<string>>(new Set())

  return (
    <Modal
      title="Nueva edición especial"
      sub="Se vende entre estas fechas. Cuánto se vende lo decide lo que produzcas."
      onClose={close}
      onSubmit={async () => {
        if (!name.trim()) throw new FormError("Escribe el nombre.")
        if (endDate < startDate) throw new FormError("La fecha de cierre debe ser después del inicio.")
        if (!pres.size) throw new FormError("Elige al menos una presentación.")
        await mutate(
          "/editions",
          "POST",
          { name: name.trim(), description: description.trim() || undefined, startDate, endDate, color, look, presentationIds: [...pres] },
          "Edición creada",
        )
        close()
      }}
    >
      <Field label="Nombre" help={HELP.editionName}><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Día de la madre" required /></Field>
      <Field label="Descripción" help={HELP.editionDescription}><textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Qué trae y por qué es especial" /></Field>
      <div className="fields">
        <Field label="Desde" help={HELP.editionDates}><input type="date" value={startDate} onChange={(e) => setStart(e.target.value)} required /></Field>
        <Field label="Hasta" help={HELP.editionDates}><input type="date" value={endDate} onChange={(e) => setEnd(e.target.value)} required /></Field>
      </div>
      <div>
        <Eyebrow help={HELP.editionSells}>Qué se vende</Eyebrow>
        <div className="seg">
          {data.presentations.map((p) => (
            <label key={p.id}>
              <input
                type="checkbox"
                checked={pres.has(p.id)}
                onChange={(e) => {
                  const next = new Set(pres)
                  if (e.target.checked) next.add(p.id)
                  else next.delete(p.id)
                  setPres(next)
                }}
              />
              <span>{p.name}</span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <Eyebrow help={HELP.productLook}>Figura</Eyebrow>
        <Seg name="look" value={look} onChange={setLook} options={[["star", "Dorada"], ["pump", "Calabaza"], ["", "Clásica"], ["choco", "Chocolate"]]} />
      </div>
      <div>
        <Eyebrow help={HELP.recipeColor}>Color</Eyebrow>
        <ColorSeg name="color" value={color} onChange={setColor} />
      </div>
    </Modal>
  )
}

// Al borrar una edición se puede desactivar lo que se vendía solo en ella
// (deja de salir en pedidos nuevos; los pedidos anteriores no cambian).
export function EditionRemoveForm({ edition }: { edition: Edition }) {
  const { data, mutate } = useKitchen()
  const { close } = useModal()
  const only = edition.presentationIds.filter(
    (id) => byId(data.presentations, id)?.active && !data.editions.some((e) => e.id !== edition.id && e.presentationIds.includes(id)),
  )
  const [hide, setHide] = useState(true)
  return (
    <Modal
      title="Eliminar edición"
      submit="Eliminar"
      danger
      onClose={close}
      onSubmit={async () => {
        await mutate(`/editions/${edition.id}${hide && only.length ? "?hide=1" : ""}`, "DELETE", undefined, "Edición eliminada")
        close()
      }}
    >
      <p>Se eliminará <b>{edition.name}</b>.</p>
      {only.length ? (
        <label className="row nowrap" style={{ gap: 10, alignItems: "flex-start", cursor: "pointer" }}>
          <input type="checkbox" checked={hide} onChange={(e) => setHide(e.target.checked)} style={{ width: 22, height: 22, flex: "none" }} />
          <span>
            También desactivar lo que se hizo para esta edición: <b>{only.map((id) => byId(data.presentations, id)?.name).join(", ")}</b>.
            <span className="small muted" style={{ display: "block" }}>Deja de salir al tomar pedidos. Los pedidos anteriores no cambian y lo puedes volver a activar en Productos.</span>
          </span>
        </label>
      ) : null}
    </Modal>
  )
}
