"use client"

import { useState } from "react"
import { Modal, FormError } from "@/components/ui/modal"
import { Icon } from "@/components/ui/icon"
import { useToast } from "@/components/ui/toast"
import { api } from "@/lib/api"
import { HELP } from "@/lib/kitchen/help"
import { Field, useModal } from "../shared"

export type StaffRole = "WAITER" | "KITCHEN"
export interface StaffDevice { id: string; label: string; lastSeenAt: string; lockedUntil: string | null }
export interface StaffMember { id: string; name: string; role: StaffRole; hasPin: boolean; hasLink: boolean; linkLockedUntil: string | null; devices: StaffDevice[] }
export interface Created { list: StaffMember[]; id: string; pin: string; token: string }

export const ROLE_NAME: Record<StaffRole, string> = { WAITER: "Mesero", KITCHEN: "Pantalla de cocina" }

// Agregar un mesero o una pantalla de cocina. El PIN lo genera Destello (Julieth, 2026-10-19; la cocina también, 2026-10-20).
export function StaffForm({ role, onDone }: { role: StaffRole; onDone: (created: Created) => void }) {
  const { close } = useModal()
  const [name, setName] = useState(role === "KITCHEN" ? "Cocina" : "")
  return (
    <Modal
      title={role === "WAITER" ? "Nuevo mesero" : "Nueva pantalla de cocina"}
      sub={role === "WAITER" ? "Destello le crea su enlace y su PIN." : "Una tablet fija que muestra los pedidos, con enlace y PIN."}
      onClose={close}
      onSubmit={async () => {
        if (!name.trim()) throw new FormError("Escribe el nombre.")
        const created = await api<Created>("/kitchen/staff", { method: "POST", body: { name: name.trim(), role } })
        close()
        onDone(created)
      }}
    >
      <Field label="Nombre" help={role === "WAITER" ? HELP.staffName : HELP.staffKitchen}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={role === "WAITER" ? "Ej. Ana" : "Ej. Cocina"} />
      </Field>
    </Modal>
  )
}

function PinBox({ name, pin }: { name: string; pin: string }) {
  return (
    <div className="pin-box">
      <span className="small muted">PIN de {name}</span>
      <b className="num">{pin}</b>
      <span className="small muted">Solo se ve esta vez.</span>
    </div>
  )
}

// El enlace (y el PIN, si es nuevo) solo se ven una vez y van juntos en el mensaje de WhatsApp. El enlace es fijo
// (Julieth, 2026-10-20): sirve siempre con el PIN, en cualquier navegador; así no hay que pedir otro cada vez.
export function InviteView({ member, url, pin }: { member: StaffMember; url: string; pin?: string | null }) {
  const { close } = useModal()
  const toast = useToast()
  const where = member.role === "WAITER" ? "la app de meseros" : "la pantalla de cocina"
  const text = `Hola ${member.name}, este es tu enlace para entrar a ${where}. Guárdalo: sirve siempre, con tu PIN.
${url}
${pin ? `Tu PIN es ${pin}. No se lo compartas a nadie.` : "Tu PIN sigue igual."}`
  // Solo para nosotros, probando en local: el panel abierto en localhost da enlaces que solo sirven en este
  // computador. En producción nunca sale (Julieth, 2026-10-19).
  const local = process.env.NODE_ENV !== "production" && /\/\/(localhost|127\.0\.0\.1)/.test(url)
  return (
    <Modal title={`Enlace de ${member.name}`} sub="Sirve siempre, con su PIN." submit="Listo" hideCancel onClose={close} onSubmit={close}>
      {pin ? <PinBox name={member.name} pin={pin} /> : null}
      <div className="invite-link num">{url}</div>
      <div className="row">
        <button type="button" className="btn soft" onClick={() => navigator.clipboard?.writeText(url).then(() => toast("Enlace copiado"))}>
          <Icon name="copy" />
          Copiar
        </button>
        <a className="btn primary" href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer">
          Enviar por WhatsApp
        </a>
      </div>
      {local ? <div className="callout c-peach small">Este enlace dice «localhost»: solo abre en este computador. Para probar en el celular, abre el panel con la dirección de red del computador (ej. http://192.168.1.1:3100).</div> : null}
      <p className="small muted">{pin ? "El mensaje lleva el enlace y su PIN." : "El enlace de antes ya no sirve."}</p>
    </Modal>
  )
}

// "Nuevo PIN": el anterior deja de servir y el nuevo se muestra una sola vez.
export function NewPinForm({ member }: { member: StaffMember }) {
  const { close } = useModal()
  const [pin, setPin] = useState<string | null>(null)
  if (pin) {
    return (
      <Modal title="PIN nuevo" submit="Listo" hideCancel onClose={close} onSubmit={close}>
        <PinBox name={member.name} pin={pin} />
      </Modal>
    )
  }
  return (
    <Modal
      title={`Nuevo PIN para ${member.name}`}
      submit="Crear PIN nuevo"
      onClose={close}
      onSubmit={async () => setPin((await api<{ pin: string }>(`/kitchen/staff/${member.id}/pin`, { method: "POST" })).pin)}
    >
      <p>El PIN de ahora deja de servir.</p>
    </Modal>
  )
}

// Quitar a alguien, desconectar un aparato o cambiar el enlace (este devuelve la ventana que sigue: el enlace nuevo).
export function StaffConfirm({ title, text, label, run }: { title: string; text: string; label: string; run: () => Promise<React.ReactNode | void> }) {
  const { open, close } = useModal()
  return (
    <Modal title={title} submit={label} danger onClose={close} onSubmit={async () => { const next = await run(); if (next) open(next); else close() }}>
      <p>{text}</p>
    </Modal>
  )
}
