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
