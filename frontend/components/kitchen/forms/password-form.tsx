"use client"

import { useState } from "react"
import { Modal, FormError } from "@/components/ui/modal"
import { useToast } from "@/components/ui/toast"
import { api } from "@/lib/api"
import { Field, useModal } from "../shared"

// Cambiar la contraseña cierra todas las demás sesiones; esta sigue abierta.
export function ChangePasswordForm() {
  const { close } = useModal()
  const toast = useToast()
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [repeat, setRepeat] = useState("")

  return (
    <Modal
      title="Cambiar contraseña"
      sub="Se cierran las sesiones abiertas en otros dispositivos."
      onClose={close}
      onSubmit={async () => {
        if (next.length < 8) throw new FormError("La nueva contraseña debe tener al menos 8 caracteres.")
        if (next !== repeat) throw new FormError("Las contraseñas nuevas no coinciden.")
        await api("/users/me/password", { method: "PATCH", body: { currentPassword: current, newPassword: next } })
        toast("Contraseña cambiada")
        close()
      }}
    >
      <Field label="Contraseña actual"><input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required /></Field>
      <div className="fields">
        <Field label="Nueva contraseña"><input type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} required /></Field>
        <Field label="Repítela"><input type="password" autoComplete="new-password" value={repeat} onChange={(e) => setRepeat(e.target.value)} required /></Field>
      </div>
    </Modal>
  )
}
