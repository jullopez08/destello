"use client"

import { useEffect, useState } from "react"
import { Modal, FormError } from "@/components/ui/modal"
import { Icon } from "@/components/ui/icon"
import { useToast } from "@/components/ui/toast"
import { api, errorMessage } from "@/lib/api"
import { HELP } from "@/lib/kitchen/help"
import { Field, HelpTip, useModal } from "../shared"

type Table = { id: string; name: string; open: boolean }

// Configuración → Mesas (solo si atiende en mesas): crear varias de una vez ("Mesa 1… Mesa 12"), renombrar y quitar.
export function TablesCard() {
  const { open } = useModal()
  const toast = useToast()
  const [tables, setTables] = useState<Table[] | null>(null)

  useEffect(() => {
    api<Table[]>("/kitchen/tables").then(setTables).catch((err) => toast(errorMessage(err), true))
  }, [toast])

  return (
    <div className="card stack">
      <h2 style={{ margin: 0 }}>Mesas <HelpTip text={HELP.tables} /></h2>
      <p className="small muted" style={{ margin: 0 }}>{tables?.length ? `${tables.length} mesas. Toca una para cambiarle el nombre.` : "Aún no tienes mesas."}</p>
      {tables?.length ? (
        <div className="row">
          {tables.map((t) => (
            <button key={t.id} type="button" className={`chip${t.open ? " ok" : ""}`} onClick={() => open(<TableForm table={t} onDone={setTables} />)}>
              {t.name}
            </button>
          ))}
        </div>
      ) : null}
      <div>
        <button type="button" className="btn soft sm" onClick={() => open(<AddTablesForm onDone={setTables} />)}>
          <Icon name="plus" />
          Agregar mesas
        </button>
      </div>
    </div>
  )
}

function AddTablesForm({ onDone }: { onDone: (t: Table[]) => void }) {
  const { close } = useModal()
  const [count, setCount] = useState("10")
  return (
    <Modal
      title="Agregar mesas"
      sub="Se numeran solas: Mesa 1, Mesa 2…"
      onClose={close}
      onSubmit={async () => {
        const n = Number(count)
        if (!(n >= 1 && n <= 50)) throw new FormError("Escribe cuántas, de 1 a 50.")
        onDone(await api<Table[]>("/kitchen/tables", { method: "POST", body: { count: n } }))
        close()
      }}
    >
      <Field label="¿Cuántas mesas?">
        <input type="number" inputMode="numeric" min="1" max="50" value={count} onChange={(e) => setCount(e.target.value)} />
      </Field>
    </Modal>
  )
}

function TableForm({ table, onDone }: { table: Table; onDone: (t: Table[]) => void }) {
  const { close } = useModal()
  const toast = useToast()
  const [name, setName] = useState(table.name)
  return (
    <Modal
      title={table.name}
      onClose={close}
      onSubmit={async () => {
        if (!name.trim()) throw new FormError("Escribe el nombre.")
        onDone(await api<Table[]>(`/kitchen/tables/${table.id}`, { method: "PATCH", body: { name: name.trim() } }))
        close()
      }}
    >
      <Field label="Nombre" help={HELP.tableName}>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={30} />
      </Field>
      <div>
        <button
          type="button"
          className="btn ghost sm"
          disabled={table.open}
          onClick={async () => {
            try {
              onDone(await api<Table[]>(`/kitchen/tables/${table.id}`, { method: "DELETE" }))
              close()
            } catch (err) {
              toast(errorMessage(err), true)
            }
          }}
        >
          <Icon name="trash" />
          Quitar mesa
        </button>
      </div>
    </Modal>
  )
}
