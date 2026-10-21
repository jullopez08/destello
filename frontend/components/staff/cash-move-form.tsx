"use client"

import { useState } from "react"
import { HelpTip } from "@/components/kitchen/shared"
import { MoneyInput } from "@/components/ui/money-input"
import { HELP } from "@/lib/kitchen/help"
import { money } from "@/lib/kitchen/format"
import { CASH_OUT_LABELS, type CashOutReason } from "@/lib/restaurant"

const pesos = (raw: string) => Math.round(Number(raw) || 0)
/** La foto se achica antes de subirla: se lee bien y pesa poco con datos del celular. */
const MAX_SIDE = 1600

async function shrink(file: File): Promise<Blob> {
  const img = await createImageBitmap(file)
  const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height))
  const canvas = document.createElement("canvas")
  canvas.width = Math.round(img.width * scale)
  canvas.height = Math.round(img.height * scale)
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("No se pudo leer la foto."))), "image/jpeg", 0.82))
}

// Efectivo que entra o sale del cajón sin ser venta (Julieth, 2026-10-21). Por defecto "Entra" (es lo normal). Sacar
// pide para qué, el detalle, la foto de la factura (o decir que no la dieron) y una confirmación antes de guardar.
export function CashMoveForm({ busy, onSave, onCancel }: { busy: boolean; onSave: (body: FormData) => Promise<boolean>; onCancel: () => void }) {
  const [kind, setKind] = useState<"IN" | "OUT">("IN")
  const [amount, setAmount] = useState("")
  const [reason, setReason] = useState("")
  const [category, setCategory] = useState<CashOutReason | null>(null)
  const [photo, setPhoto] = useState<Blob | null>(null)
  const [noReceipt, setNoReceipt] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const out = kind === "OUT"
  const ready = pesos(amount) > 0 && reason.trim() && (!out || (category && (photo || noReceipt)))

  async function pick(file: File | undefined) {
    setError(null)
    if (!file) return setPhoto(null)
    try {
      setPhoto(await shrink(file))
      setNoReceipt(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo leer la foto.")
    }
  }

  async function save() {
    const body = new FormData()
    body.set("kind", kind)
    body.set("amount", String(pesos(amount)))
    body.set("reason", reason.trim())
    if (out) {
      body.set("category", category!)
      if (photo) body.set("receipt", photo, "factura.jpg")
      else body.set("noReceipt", "true")
    }
    if (await onSave(body)) onCancel()
    else setConfirm(false)
  }

  if (confirm)
    return (
      <div className="callout c-peach stack">
        <b>¿Seguro que sacas {money(pesos(amount))} de la caja?</b>
        <span className="small">{CASH_OUT_LABELS[category!]}: {reason.trim()}. {photo ? "Con la foto de la factura." : "Sin factura: la dueña lo revisa."}</span>
        <div className="row">
          <button type="button" className="btn soft sm" disabled={busy} onClick={save}>{busy ? "Guardando…" : "Sí, sacar"}</button>
          <button type="button" className="btn ghost sm" onClick={() => setConfirm(false)}>No, revisar</button>
        </div>
      </div>
    )

  return (
    <fieldset className="f stack">
      <legend className="f-label">Efectivo que entra o sale <HelpTip text={HELP.cashMove} /></legend>
      <div className="seg">
        {([["IN", "Entra"], ["OUT", "Sale"]] as const).map(([k, label]) => (
          <label key={k}><input type="radio" name="cash-move" checked={kind === k} onChange={() => setKind(k)} /><span>{label}</span></label>
        ))}
      </div>
      {out ? (
        <div className="seg">
          {(Object.keys(CASH_OUT_LABELS) as CashOutReason[]).map((c) => (
            <label key={c}><input type="radio" name="cash-out-reason" checked={category === c} onChange={() => setCategory(c)} /><span>{CASH_OUT_LABELS[c]}</span></label>
          ))}
        </div>
      ) : null}
      <MoneyInput value={amount} onChange={setAmount} aria-label="Valor" />
      <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={80} placeholder={out ? "A quién o para qué: hielo de Don Pedro…" : "Lo que trajo el repartidor…"} aria-label="Detalle" />
      {out ? (
        <>
          <label className="f">
            <span className="f-label">Foto de la factura o el recibo <HelpTip text={HELP.cashReceipt} /></span>
            <input type="file" accept="image/*" capture="environment" onChange={(e) => pick(e.target.files?.[0])} />
          </label>
          {photo ? null : (
            <label className="row small nowrap" style={{ gap: 8 }}>
              <input type="checkbox" checked={noReceipt} onChange={(e) => setNoReceipt(e.target.checked)} style={{ width: 18, height: 18, accentColor: "var(--accent-deep)" }} />
              No me dieron factura
            </label>
          )}
        </>
      ) : null}
      {error ? <div className="err" role="alert">{error}</div> : null}
      <div className="row">
        <button type="button" className="btn soft sm" disabled={busy || !ready} onClick={() => (out ? setConfirm(true) : save())}>{out ? "Sacar efectivo" : "Anotar entrada"}</button>
        <button type="button" className="btn ghost sm" onClick={onCancel}>Cancelar</button>
      </div>
    </fieldset>
  )
}
