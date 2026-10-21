"use client"

import { useRef, useState } from "react"
import { HelpTip } from "@/components/kitchen/shared"
import { MoneyInput } from "@/components/ui/money-input"
import { HELP } from "@/lib/kitchen/help"
import { money } from "@/lib/kitchen/format"
import { PAY_METHODS, TIP_PERCENT, tipFor, type FloorSession, type PayKey, type PayMethod } from "@/lib/restaurant"

export type CloseBody = { tip: boolean; payments: { method: PayMethod; amount: number }[] }
type Part = { key: number; method: PayMethod; amount: string }

const pesos = (raw: string) => Math.round(Number(raw) || 0)

// La cuenta de una mesa (Julieth, 2026-10-20): lo consumido, la propina sugerida (voluntaria) y cómo paga: una forma
// o dividida. El servidor vuelve a calcular todo; aquí es para mostrarlo y que los pagos sumen exacto.
export function TableBill({ session, payKeys, busy, onClose }: { session: FloorSession; payKeys: PayKey[]; busy: boolean; onClose: (body: CloseBody) => void }) {
  const [tip, setTip] = useState(true)
  const [method, setMethod] = useState<PayMethod | null>(null)
  const [given, setGiven] = useState("")
  const nextKey = useRef(2)
  const [parts, setParts] = useState<Part[] | null>(null)

  const lines = new Map<string, { name: string; qty: number; unitPrice: number }>()
  for (const l of session.tickets.flatMap((k) => k.lines)) {
    const key = `${l.name}|${l.unitPrice}`
    const prev = lines.get(key)
    lines.set(key, { name: l.name, unitPrice: l.unitPrice, qty: (prev?.qty ?? 0) + l.qty })
  }
  const total = session.total + (tip ? tipFor(session.total) : 0)
  const payments = parts ? parts.map((p) => ({ method: p.method, amount: pesos(p.amount) })).filter((p) => p.amount > 0) : method ? [{ method, amount: total }] : []
  const missing = total - payments.reduce((a, p) => a + p.amount, 0)
  const change = !parts && method === "CASH" ? pesos(given) - total : 0
  const transfer = payments.some((p) => p.method === "TRANSFER") || (!parts && method === "TRANSFER")
  const setPart = (key: number, patch: Partial<Part>) => setParts(parts!.map((p) => (p.key === key ? { ...p, ...patch } : p)))

  return (
    <section className="card stack bill">
      <b>Cuenta</b>
      {[...lines.values()].map((l) => (
        <div key={`${l.name}|${l.unitPrice}`} className="row between nowrap small">
          <span>{l.qty} × {l.name}</span>
          <span className="num">{money(l.qty * l.unitPrice)}</span>
        </div>
      ))}
      <div className="row between nowrap"><span>Consumo</span><span className="num">{money(session.total)}</span></div>
      <fieldset className="f">
        <legend className="f-label">Propina sugerida ({TIP_PERCENT} %) <HelpTip text={HELP.tableTip} /></legend>
        <div className="seg">
          {([[true, `Incluir ${money(tipFor(session.total))}`], [false, "Sin propina"]] as const).map(([value, label]) => (
            <label key={label}>
              <input type="radio" name="tip" checked={tip === value} onChange={() => setTip(value)} />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="row between nowrap bill-total"><b>Total</b><b className="num">{money(total)}</b></div>

      <fieldset className="f">
        <legend className="f-label">¿Cómo paga? <HelpTip text={HELP.tablePay} /></legend>
        {!parts ? (
          <div className="seg">
            {PAY_METHODS.map((m) => (
              <label key={m.method}>
                <input type="radio" name="pay" checked={method === m.method} onChange={() => setMethod(m.method)} />
                <span>{m.label}</span>
              </label>
            ))}
          </div>
        ) : (
          parts.map((p) => (
            <div key={p.key} className="row nowrap bill-part">
              <select value={p.method} onChange={(e) => setPart(p.key, { method: e.target.value as PayMethod })} aria-label="Forma de pago">
                {PAY_METHODS.map((m) => <option key={m.method} value={m.method}>{m.label}</option>)}
              </select>
              <MoneyInput value={p.amount} onChange={(amount) => setPart(p.key, { amount })} aria-label="Valor" />
              {parts.length > 2 ? <button type="button" className="linkbtn" onClick={() => setParts(parts.filter((x) => x.key !== p.key))}>Quitar</button> : null}
            </div>
          ))
        )}
      </fieldset>
      {parts ? (
        <div className="row between nowrap small">
          <button type="button" className="linkbtn" onClick={() => setParts([...parts, { key: nextKey.current++, method: "CASH", amount: missing > 0 ? String(missing) : "" }])}>+ Otro pago</button>
          <span className="num">{missing > 0 ? `Faltan ${money(missing)}` : missing < 0 ? `Sobran ${money(-missing)}` : "Completo"}</span>
        </div>
      ) : null}
      <button type="button" className="linkbtn" onClick={() => setParts(parts ? null : [{ key: 0, method: "CASH", amount: "" }, { key: 1, method: "TRANSFER", amount: "" }])}>
        {parts ? "Pagar con una sola forma" : "Dividir el pago"}
      </button>

      {!parts && method === "CASH" ? (
        <label className="f">
          <span className="f-label">¿Con cuánto paga?</span>
          <MoneyInput value={given} onChange={setGiven} />
          {change > 0 ? <span className="h">Devuelves <b className="num">{money(change)}</b></span> : null}
        </label>
      ) : null}
      {transfer ? (
        <div className="callout c-sky small">
          {payKeys.length ? payKeys.map((k) => <div key={k.id}><b>{k.type}: {k.number}</b>{k.bank ? ` · ${k.bank}` : ""} · {k.owner}</div>) : "El negocio aún no tiene llaves ni cuentas. Se agregan en Configuración."}
        </div>
      ) : null}

      <button type="button" className="btn primary" disabled={busy || !payments.length || missing !== 0} onClick={() => onClose({ tip, payments })}>
        {busy ? "Cobrando…" : `Cobrar ${money(total)} y liberar la mesa`}
      </button>
    </section>
  )
}
