"use client"

import { useState } from "react"
import { HelpTip } from "@/components/kitchen/shared"
import { HELP } from "@/lib/kitchen/help"
import { CANCEL_REASON_LABELS, type CancelReason } from "@/lib/restaurant"

// Comanda trabada en cocina (Julieth, 2026-10-21): la cocina no tocó "Listo" y la mesa no se puede cobrar. La caja
// (encargado de caja o la dueña) la destraba: ya salió (descuenta insumos y se cobra) o anularla (no se hizo). Anular
// pide el motivo: sin él la dueña no puede revisar las anulaciones en Caja.
export function StuckTicket({ number, busy, onOut, onCancel }: { number: number; busy: boolean; onOut: () => void; onCancel: (reason: CancelReason) => void }) {
  const [asking, setAsking] = useState(false)
  const [reason, setReason] = useState<CancelReason | null>(null)
  if (asking)
    return (
      <fieldset className="f stuck-ticket">
        <legend className="f-label">¿Por qué se anula la comanda {number}? <HelpTip text={HELP.ticketCancelReason} /></legend>
        <div className="seg">
          {(Object.keys(CANCEL_REASON_LABELS) as CancelReason[]).map((r) => (
            <label key={r}>
              <input type="radio" name={`reason-${number}`} checked={reason === r} onChange={() => setReason(r)} />
              <span>{CANCEL_REASON_LABELS[r]}</span>
            </label>
          ))}
        </div>
        <div className="row">
          <button type="button" className="btn soft sm" disabled={busy || !reason} onClick={() => { setAsking(false); onCancel(reason!) }}>Anular comanda</button>
          <button type="button" className="btn ghost sm" onClick={() => { setAsking(false); setReason(null) }}>No anular</button>
        </div>
      </fieldset>
    )
  return (
    <div className="row stuck-ticket">
      <button type="button" className="btn soft sm" disabled={busy} onClick={onOut}>Ya salió de cocina</button>
      <button type="button" className="btn ghost sm" disabled={busy} onClick={() => setAsking(true)}>Anular comanda</button>
      <HelpTip text={HELP.ticketStuck} />
    </div>
  )
}
