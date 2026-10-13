"use client"

import { useState } from "react"
import { Modal, FormError } from "@/components/ui/modal"
import { useKitchen } from "@/lib/kitchen/store"
import { Field, useModal } from "../shared"

// Una llave Bre-B se guarda como una cuenta más con este tipo: la llave va en
// "number". Puede ser celular, correo, cédula o el código del banco; no se
// valida el formato porque cualquier llave inscrita sirve para transferir.
export const BREB_TYPE = "Llave Bre-B"

export function AccountForm() {
  const { data, mutate } = useKitchen()
  const { close } = useModal()
  const [kind, setKind] = useState<"bank" | "breb">("bank")
  const [f, setF] = useState({ bank: "", type: "Ahorros", number: "", owner: data.settings.name })
  const set = (patch: Partial<typeof f>) => setF((x) => ({ ...x, ...patch }))
  const breb = kind === "breb"

  return (
    <Modal
      title={breb ? "Nueva llave Bre-B" : "Nueva cuenta"}
      sub={breb ? "La llave que inscribiste en tu banco: celular, correo, cédula o el código que te dieron." : undefined}
      onClose={close}
      onSubmit={async () => {
        if (breb) {
          if (!f.number.trim()) throw new FormError("Escribe la llave.")
        } else if (!f.bank.trim() || !f.number.trim()) {
          throw new FormError("Escribe el banco y el número.")
        }
        await mutate(
          "/accounts",
          "POST",
          {
            bank: f.bank.trim(),
            type: breb ? BREB_TYPE : f.type.trim() || "Cuenta",
            number: f.number.trim(),
            owner: f.owner.trim() || data.settings.name,
          },
          breb ? "Llave agregada" : "Cuenta agregada",
        )
        close()
      }}
    >
      <div className="fields">
        <div className="seg" style={{ gridColumn: "1 / -1" }}>
          <label>
            <input type="radio" name="account-kind" checked={!breb} onChange={() => setKind("bank")} />
            <span>Cuenta bancaria</span>
          </label>
          <label>
            <input type="radio" name="account-kind" checked={breb} onChange={() => setKind("breb")} />
            <span>Llave Bre-B</span>
          </label>
        </div>
        {breb ? (
          <>
            <Field label="Llave"><input value={f.number} onChange={(e) => set({ number: e.target.value })} placeholder="Ej. 3001234567 o tu@correo.com" required /></Field>
            <Field label="Banco (opcional)"><input value={f.bank} onChange={(e) => set({ bank: e.target.value })} placeholder="Ej. Nequi" /></Field>
          </>
        ) : (
          <>
            <Field label="Banco"><input value={f.bank} onChange={(e) => set({ bank: e.target.value })} placeholder="Ej. Davivienda" required /></Field>
            <Field label="Tipo"><input value={f.type} onChange={(e) => set({ type: e.target.value })} placeholder="Ahorros" /></Field>
            <Field label="Número"><input value={f.number} onChange={(e) => set({ number: e.target.value })} required /></Field>
          </>
        )}
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
