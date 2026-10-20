"use client"

import { Modal } from "@/components/ui/modal"
import { useKitchen } from "@/lib/kitchen/store"
import { useModal } from "../shared"

// Confirmación para acciones que borran o cancelan algo.
export function ConfirmForm({ title, text, label, path, method, done }: { title: string; text: React.ReactNode; label: string; path: string; method: string; done: string }) {
  const { mutate } = useKitchen()
  const { close } = useModal()
  return (
    <Modal
      title={title}
      submit={label}
      danger
      onClose={close}
      onSubmit={async () => {
        await mutate(path, method, undefined, done)
        close()
      }}
    >
      <p>{text}</p>
    </Modal>
  )
}

// "¿Está seguro?" antes de guardar (Julieth, 2026-10-19): muestra lo que va a quedar en la tarjeta. Se abre encima
// del formulario: «No, modificar» vuelve a él tal como estaba; «Sí, confirmar» guarda y cierra los dos.
export function ConfirmSave({ title, rows, onConfirm }: { title: string; rows: [string, React.ReactNode][]; onConfirm: () => Promise<unknown> }) {
  const { close } = useModal()
  return (
    <Modal
      title={title}
      sub="Revisa que todo esté bien."
      submit="Sí, confirmar"
      cancel="No, modificar"
      onClose={close}
      onSubmit={async () => {
        await onConfirm()
        close()
        close()
      }}
    >
      <dl className="confirm-rows">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </Modal>
  )
}
