"use client"

import { useState } from "react"
import { Modal, FormError } from "@/components/ui/modal"
import { useKitchen } from "@/lib/kitchen/store"
import { addDays } from "@/lib/kitchen/rules"
import type { CookieLook } from "@/lib/kitchen/types"
import { ColorSeg, Eyebrow, Field, Seg, toNumber, useModal } from "../shared"

// ── Edición especial ──

export function EditionForm() {
  const { data, mutate } = useKitchen()
  const { close } = useModal()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [startDate, setStart] = useState(data.today)
  const [endDate, setEnd] = useState(addDays(data.today, 14))
  const [cap, setCap] = useState("")
  const [color, setColor] = useState("strawberry")
  const [look, setLook] = useState<CookieLook>("star")
  const [pres, setPres] = useState<Set<string>>(new Set())

  return (
    <Modal
      title="Nueva edición especial"
      sub="Se vende hasta la fecha de cierre o hasta completar el cupo, lo que pase primero."
      onClose={close}
      onSubmit={async () => {
        if (!name.trim()) throw new FormError("Escribe el nombre.")
        if (endDate < startDate) throw new FormError("La fecha de cierre debe ser después del inicio.")
        if (!pres.size) throw new FormError("Elige al menos una presentación.")
        await mutate(
          "/editions",
          "POST",
          { name: name.trim(), description: description.trim() || undefined, startDate, endDate, cap: Math.max(0, Math.round(toNumber(cap) || 0)), color, look, presentationIds: [...pres] },
          "Edición creada",
        )
        close()
      }}
    >
      <Field label="Nombre"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Día de la madre" required /></Field>
      <Field label="Descripción"><textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Qué trae y por qué es especial" /></Field>
      <div className="fields">
        <Field label="Desde"><input type="date" value={startDate} onChange={(e) => setStart(e.target.value)} required /></Field>
        <Field label="Hasta"><input type="date" value={endDate} onChange={(e) => setEnd(e.target.value)} required /></Field>
        <Field label="Cupo (opcional)"><input type="number" min="1" value={cap} onChange={(e) => setCap(e.target.value)} placeholder="Sin límite" /></Field>
      </div>
      <div>
        <Eyebrow>Qué se vende</Eyebrow>
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
        <Eyebrow>Figura</Eyebrow>
        <Seg name="look" value={look} onChange={setLook} options={[["star", "Dorada"], ["pump", "Calabaza"], ["", "Clásica"], ["choco", "Chocolate"]]} />
      </div>
      <div>
        <Eyebrow>Color</Eyebrow>
        <ColorSeg name="color" value={color} onChange={setColor} />
      </div>
    </Modal>
  )
}
