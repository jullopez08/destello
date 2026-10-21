"use client"

import { useCallback, useEffect, useState } from "react"
import { useToast } from "@/components/ui/toast"
import { TableBill, type CloseBody } from "@/components/staff/table-bill"
import { api, errorMessage } from "@/lib/api"
import { HELP } from "@/lib/kitchen/help"
import { money } from "@/lib/kitchen/format"
import { STAGES, tableStage, type Floor } from "@/lib/restaurant"
import { Empty, PageHead } from "../shared"

const REFRESH_MS = 10000

// La caja (Julieth, 2026-10-20): muchas veces el cliente se para y paga en la caja. La dueña ve las mesas abiertas
// y cobra cualquiera con la misma cuenta del mesero (propina sugerida, pago dividido, llaves para transferir).
export function CashierView() {
  const toast = useToast()
  const [floor, setFloor] = useState<Floor | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => api<Floor>("/kitchen/cashier").then((f) => { setFloor(f); setError(null) }).catch((err) => setError(errorMessage(err))), [])
  useEffect(() => {
    load()
    const poll = window.setInterval(load, REFRESH_MS)
    return () => window.clearInterval(poll)
  }, [load])

  const open = floor?.tables.filter((t) => t.session) ?? []
  const table = open.find((t) => t.id === openId)

  async function close(body: CloseBody) {
    if (!table?.session) return
    setBusy(true)
    try {
      setFloor(await api<Floor>(`/kitchen/cashier/sessions/${table.session.id}/close`, { method: "POST", body }))
      toast(`${table.name} cobrada`)
      setOpenId(null)
    } catch (err) {
      toast(errorMessage(err), true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHead title="Caja" sub="Cobra las mesas cuando el cliente paga en la caja." help={HELP.pageCashier} />
      {error ? <div className="err" role="alert">{error}</div> : null}
      {table?.session ? (
        <div className="stack cashier-bill">
          <div className="row between nowrap">
            <button type="button" className="btn ghost sm" onClick={() => setOpenId(null)}>‹ Mesas</button>
            <h2 style={{ margin: 0 }}>{table.name}</h2>
            <span className="small muted">{table.session.waiter ? `Atiende ${table.session.waiter}` : ""}</span>
          </div>
          {table.session.tickets.some((k) => k.status === "SENT") ? <div className="callout c-peach small">Aún hay una comanda en cocina: se cobra cuando la cocina la marque lista.</div> : null}
          <TableBill session={table.session} payKeys={floor!.payKeys} taxRate={floor!.taxRate} busy={busy} onClose={close} />
        </div>
      ) : !floor ? (
        <p className="muted">Cargando…</p>
      ) : open.length ? (
        <div className="floor-grid">
          {open.map((t) => {
            const stage = tableStage(t.session)
            return (
              <button key={t.id} type="button" className={`table-tile ${stage}`} onClick={() => setOpenId(t.id)}>
                <b>{t.name}</b>
                <span className="small">{STAGES.find((g) => g.stage === stage)!.label}{t.session?.waiter ? ` · ${t.session.waiter}` : ""}</span>
                <span className="table-clock num">{money(t.session!.total)}</span>
              </button>
            )
          })}
        </div>
      ) : (
        <Empty>No hay mesas abiertas.</Empty>
      )}
    </>
  )
}
