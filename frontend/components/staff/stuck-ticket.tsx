"use client"

import { useState } from "react"
import { HelpTip } from "@/components/kitchen/shared"
import { HELP } from "@/lib/kitchen/help"

// Comanda trabada en cocina (Julieth, 2026-10-21): la cocina no tocó "Listo" y la mesa no se puede cobrar. La caja
// (encargado de caja o la dueña) la destraba: ya salió (descuenta insumos y se cobra) o anularla (no se hizo).
export function StuckTicket({ number, busy, onOut, onCancel }: { number: number; busy: boolean; onOut: () => void; onCancel: () => void }) {
  const [asking, setAsking] = useState(false)
  if (asking)
    return (
      <div className="stack stuck-ticket">
        <span className="small">¿Anular la comanda {number}? No se cobra y queda en Caja como anulada.</span>
        <div className="row">
          <button type="button" className="btn soft sm" disabled={busy} onClick={() => { setAsking(false); onCancel() }}>Sí, anular</button>
          <button type="button" className="btn ghost sm" onClick={() => setAsking(false)}>No</button>
        </div>
      </div>
    )
  return (
    <div className="row stuck-ticket">
      <button type="button" className="btn soft sm" disabled={busy} onClick={onOut}>Ya salió de cocina</button>
      <button type="button" className="btn ghost sm" disabled={busy} onClick={() => setAsking(true)}>Anular comanda</button>
      <HelpTip text={HELP.ticketStuck} />
    </div>
  )
}
