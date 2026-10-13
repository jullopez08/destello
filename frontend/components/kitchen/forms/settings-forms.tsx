"use client"

import { useState } from "react"
import { Modal, FormError } from "@/components/ui/modal"
import { useKitchen } from "@/lib/kitchen/store"
import { Field, useModal } from "../shared"

export function AccountForm() {
  const { data, mutate } = useKitchen()
  const { close } = useModal()
  const [f, setF] = useState({ bank: "", type: "Ahorros", number: "", owner: data.settings.name })
  const set = (patch: Partial<typeof f>) => setF((x) => ({ ...x, ...patch }))

  return (
    <Modal
      title="Nueva cuenta"
      onClose={close}
      onSubmit={async () => {
        if (!f.bank.trim() || !f.number.trim()) throw new FormError("Escribe el banco y el número.")
        await mutate("/accounts", "POST", { bank: f.bank.trim(), type: f.type.trim() || "Cuenta", number: f.number.trim(), owner: f.owner.trim() || data.settings.name }, "Cuenta agregada")
        close()
      }}
    >
      <div className="fields">
        <Field label="Banco"><input value={f.bank} onChange={(e) => set({ bank: e.target.value })} placeholder="Ej. Davivienda" required /></Field>
        <Field label="Tipo"><input value={f.type} onChange={(e) => set({ type: e.target.value })} placeholder="Ahorros" /></Field>
        <Field label="Número"><input value={f.number} onChange={(e) => set({ number: e.target.value })} required /></Field>
        <Field label="Titular"><input value={f.owner} onChange={(e) => set({ owner: e.target.value })} /></Field>
      </div>
    </Modal>
  )
}

export function CourierForm() {
  const { mutate } = useKitchen()
  const { close } = useModal()
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")

  return (
    <Modal
      title="Nuevo repartidor"
      sub="Queda al final de la lista. Puedes subirlo después."
      onClose={close}
      onSubmit={async () => {
        if (!name.trim() || !phone.trim()) throw new FormError("Escribe nombre y WhatsApp.")
        await mutate("/couriers", "POST", { name: name.trim(), phone: phone.trim() }, "Repartidor agregado")
        close()
      }}
    >
      <div className="fields">
        <Field label="Nombre"><input value={name} onChange={(e) => setName(e.target.value)} required /></Field>
        <Field label="WhatsApp"><input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" required /></Field>
      </div>
    </Modal>
  )
}
