"use client"

import { useState } from "react"
import { Modal } from "@/components/ui/modal"
import { useKitchen } from "@/lib/kitchen/store"
import { perishableByDefault } from "@/lib/kitchen/batches"
import type { Supply } from "@/lib/kitchen/types"
import { Seg, useModal } from "../shared"

// «Revisar vencimientos»: todos los ingredientes con su Sí / No para dejarlos bien de una vez.
// Arranca con lo que tiene cada uno; con `suggest`, los que suelen vencer ya vienen en Sí.
export function PerishableReview({ suggest }: { suggest?: boolean }) {
  const { data, mutate } = useKitchen()
  const { close } = useModal()
  const list = data.supplies.filter((s) => s.category === "INGREDIENT").sort((a, b) => a.name.localeCompare(b.name))
  const start = (s: Supply) => s.perishable || (!!suggest && perishableByDefault(s.name, s.category))
  const [marks, setMarks] = useState<Record<string, boolean>>(() => Object.fromEntries(list.map((s) => [s.id, start(s)])))
  const count = Object.values(marks).filter(Boolean).length

  return (
    <Modal
      title="Revisar vencimientos"
      sub="Marca los que traen fecha de vencimiento."
      submit={`Guardar (${count} con fecha)`}
      onClose={close}
      onSubmit={async () => {
        await mutate("/supplies/perishable", "PATCH", { items: list.map((s) => ({ supplyId: s.id, perishable: marks[s.id] })) }, "Vencimientos guardados")
        close()
      }}
    >
      <div className="list perishable-list">
        {list.map((s) => (
          <div className="it" key={s.id}>
            <span>{s.name}</span>
            <Seg name={`p-${s.id}`} value={marks[s.id] ? "si" : "no"} onChange={(v) => setMarks((m) => ({ ...m, [s.id]: v === "si" }))} options={[["no", "No vence"], ["si", "Vence"]]} />
          </div>
        ))}
      </div>
    </Modal>
  )
}
