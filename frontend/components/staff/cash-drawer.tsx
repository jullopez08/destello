"use client"

import { useCallback, useEffect, useState } from "react"
import { HelpTip } from "@/components/kitchen/shared"
import { MoneyInput } from "@/components/ui/money-input"
import { api, errorMessage } from "@/lib/api"
import { HELP } from "@/lib/kitchen/help"
import { money } from "@/lib/kitchen/format"
import { CASH_OUT_LABELS, type CashOutcome, type CashOutReason, type CashState } from "@/lib/restaurant"
import { CashMoveForm } from "./cash-move-form"

const hm = (iso: string) => new Date(iso).toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit" })
const pesos = (raw: string) => Math.round(Number(raw) || 0)

// El cajón (Julieth, 2026-10-21): abrir con la base, anotar el efectivo que entra o sale sin ser venta y cerrar
// contando a ciegas. Si no cuadra se cuenta otra vez sin pistas; si tampoco, sale la diferencia y se escribe qué pasó.
// La dueña (`owner`) ve cuánto debería haber; el encargado de caja no.
export function CashDrawer({ base, owner, onState }: { base: string; owner: boolean; onState?: (s: CashState) => void }) {
  const [state, setState] = useState<CashState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [opening, setOpening] = useState("")
  // Anotar efectivo que entra o sale va escondido: lo normal es que entre plata por las ventas (Julieth, 2026-10-21).
  const [moving, setMoving] = useState(false)
  const [closing, setClosing] = useState(false)
  const [counted, setCounted] = useState("")
  const [note, setNote] = useState("")
  const [outcome, setOutcome] = useState<CashOutcome | null>(null)

  const show = useCallback((s: CashState) => { setState(s); onState?.(s) }, [onState])
  useEffect(() => { api<CashState>(base).then(show).catch((err) => setError(errorMessage(err))) }, [base, show])

  async function run(path: string, body: unknown) {
    setBusy(true)
    setError(null)
    try {
      const res = await api<CashState & { outcome?: CashOutcome }>(`${base}/${path}`, { method: "POST", body })
      show(res)
      return res
    } catch (err) {
      setError(errorMessage(err))
      return null
    } finally {
      setBusy(false)
    }
  }

  async function close() {
    const res = await run("close", { counted: pesos(counted), ...(note.trim() ? { note: note.trim() } : {}) })
    if (!res?.outcome) return
    setOutcome(res.outcome)
    if (res.outcome.kind === "recount") setCounted("")
    if (res.outcome.kind === "close") { setClosing(false); setCounted(""); setNote("") }
  }

  if (!state) return error ? <div className="err" role="alert">{error}</div> : <p className="muted">Cargando…</p>
  const s = state.shift

  if (!s)
    return (
      <section className="card stack cash-drawer">
        {outcome?.kind === "close" ? <div className="callout c-mint small" role="status">Caja cerrada.</div> : null}
        <b>Caja cerrada</b>
        <label className="f">
          <span className="f-label">¿Con cuánta base abres? <HelpTip text={HELP.cashOpening} /></span>
          <MoneyInput value={opening} onChange={setOpening} />
        </label>
        {error ? <div className="err" role="alert">{error}</div> : null}
        <button type="button" className="btn primary" disabled={busy} onClick={() => run("open", { openingCash: pesos(opening) }).then((ok) => ok && setOpening(""))}>Abrir caja</button>
      </section>
    )

  return (
    <section className="card stack cash-drawer">
      <div className="row between nowrap">
        <b>Caja abierta</b>
        <span className="small muted">Desde {hm(s.openedAt)} · {s.openedBy}</span>
      </div>
      <div className="row between nowrap small"><span>Base</span><span className="num">{money(s.openingCash)}</span></div>
      {owner && s.expected !== undefined ? (
        <div className="callout c-sky small">
          Debería haber <b className="num">{money(s.expected)}</b>: base, mesas en efectivo {money(s.tables ?? 0)}, pedidos que recogieron {money(s.pickups ?? 0)}, más entradas y menos salidas.
          <div style={{ marginTop: 6 }}>Fuera del cajón: transferencias {money(s.transfer ?? 0)} y tarjeta {money(s.card ?? 0)}. Cuádralas con el banco y el datáfono.</div>
        </div>
      ) : null}
      {s.moves.map((m) => (
        <div key={m.id} className="row between nowrap small">
          <span>
            {m.kind === "IN" ? "Entró" : `Salió · ${CASH_OUT_LABELS[m.category as CashOutReason] ?? ""}`} · {m.reason} · {m.by} · {hm(m.at)}
            {m.noReceipt ? <span className="chip warn" style={{ marginLeft: 6 }}>Sin factura</span> : null}
          </span>
          <span className="num">{m.kind === "IN" ? "+" : "−"}{money(m.amount)}</span>
        </div>
      ))}

      {!closing ? (
        <>
          {moving ? (
            <CashMoveForm busy={busy} onSave={(body) => run("moves", body).then(Boolean)} onCancel={() => setMoving(false)} />
          ) : (
            <button type="button" className="linkbtn small" onClick={() => setMoving(true)}>Anotar efectivo que entra o sale</button>
          )}
          {error ? <div className="err" role="alert">{error}</div> : null}
          <button type="button" className="btn soft" onClick={() => { setClosing(true); setOutcome(null); setMoving(false) }}>Cerrar caja</button>
        </>
      ) : (
        <>
          {outcome?.kind === "recount" || s.recount ? <div className="callout c-peach small" role="alert">No cuadra. Cuenta de nuevo con calma, billete por billete.</div> : null}
          {outcome?.kind === "explain" ? (
            <div className="callout c-strawberry small" role="alert">
              Sigue sin cuadrar: {outcome.difference < 0 ? `faltan ${money(-outcome.difference)}` : `sobran ${money(outcome.difference)}`}. Escribe qué pasó para cerrar; la dueña lo revisa.
            </div>
          ) : null}
          <label className="f">
            <span className="f-label">¿Cuánto efectivo hay en el cajón? <HelpTip text={HELP.cashCount} /></span>
            <MoneyInput value={counted} onChange={setCounted} />
          </label>
          {outcome?.kind === "explain" ? (
            <label className="f">
              <span className="f-label">¿Qué pasó?</span>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} rows={2} placeholder="Di mal un vuelto…" />
            </label>
          ) : null}
          {error ? <div className="err" role="alert">{error}</div> : null}
          <div className="row">
            <button type="button" className="btn primary" disabled={busy || counted === "" || (outcome?.kind === "explain" && !note.trim())} onClick={close}>{busy ? "Revisando…" : "Contado"}</button>
            <button type="button" className="btn ghost" onClick={() => setClosing(false)}>Volver</button>
          </div>
        </>
      )}
    </section>
  )
}
