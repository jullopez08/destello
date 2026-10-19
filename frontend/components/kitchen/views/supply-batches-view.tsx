"use client"

import { useState } from "react"
import { Icon } from "@/components/ui/icon"
import { byId, useKitchen } from "@/lib/kitchen/store"
import { batchesToWatch, perishableByDefault } from "@/lib/kitchen/batches"
import { dateLabel, money, qty } from "@/lib/kitchen/format"
import type { SupplyBatch } from "@/lib/kitchen/types"
import { Empty, useModal } from "../shared"
import { ConfirmForm } from "../forms/confirm-form"
import { PerishableReview } from "../forms/perishable-review"

// Botar lo que queda de un lote de insumo (vencido o dañado): baja la existencia y queda como pérdida.
export function DiscardBatchForm({ batch }: { batch: SupplyBatch }) {
  const { data } = useKitchen()
  const s = byId(data.supplies, batch.supplyId)
  const left = Math.min(batch.left, s?.stock ?? batch.left)
  const cost = s ? left * s.cost : 0
  return (
    <ConfirmForm
      title="Botar insumo"
      text={
        <>
          Vas a botar <b>{s ? qty(left, s.kind) : left}</b> de {s?.name.toLowerCase()}{cost > 0 ? <> (te costaron unos <b>{money(cost)}</b>)</> : null}. Sale de tus insumos y queda
          como pérdida en Analítica.
        </>
      }
      label="Botar"
      path={`/supply-batches/${batch.id}/discard`}
      method="POST"
      done="Insumo botado"
    />
  )
}

// Pestaña «Por vencer» de Insumos: lo vencido y lo que vence en 2 días o menos.
export function ExpiringBatches() {
  const { data } = useKitchen()
  const { open } = useModal()
  const list = batchesToWatch(data.supplyBatches, data.today)
  if (!list.length) return <Empty>Nada por vencer en los próximos 2 días.</Empty>

  return (
    <div className="tbl cardify">
      <table>
        <thead>
          <tr><th>Insumo</th><th>Queda</th><th>Vence</th><th>Estado</th><th /></tr>
        </thead>
        <tbody>
          {list.map(({ b, st }) => {
            const s = byId(data.supplies, b.supplyId)
            return (
              <tr key={b.id}>
                <td className="c-title"><b>{s?.name}</b></td>
                <td className="c-hero num" data-label="Queda">{s ? qty(b.left, s.kind) : b.left}</td>
                <td className="c-end" data-label={st.expired ? "Venció" : "Vence"}>{dateLabel(b.expiresOn, data.today)}</td>
                <td className="c-badge" data-label="Estado"><span className={`chip ${st.expired ? "bad" : "warn"}`}>{st.label}</span></td>
                <td className="c-actions r">
                  <button type="button" className={`btn ${st.expired ? "soft" : "ghost"} sm`} onClick={() => open(<DiscardBatchForm batch={b} />)}>
                    <Icon name="trash" />
                    Botar
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// Avisos de Hoy: insumo vencido (con botón para botarlo) o que vence en 2 días o menos.
export function SupplyAlerts() {
  const { data } = useKitchen()
  const { open } = useModal()
  const list = batchesToWatch(data.supplyBatches, data.today)
  if (!list.length) return null

  return (
    <div className="lot-alerts" role="group" aria-label="Avisos de insumos por vencer">
      {list.map(({ b, st }) => {
        const s = byId(data.supplies, b.supplyId)
        const name = s?.name.toLowerCase() ?? "insumo"
        const amount = s ? qty(b.left, s.kind) : ""
        return (
          <div key={b.id} className={`callout ${st.expired ? "c-strawberry" : "c-peach"} lot-alert`}>
            <span>
              {st.expired ? (
                <>
                  <b>{s?.name}</b> está <b>vencido</b> ({amount}). Ya no se cuenta en la producción.
                </>
              ) : st.daysLeft === 2 ? (
                <>
                  Quedan <b>2 días</b> para usar <b>{name}</b> ({amount}) antes de que venza.
                </>
              ) : (
                <>
                  <b>{s?.name}</b> ({amount}) <b>{st.daysLeft === 0 ? "vence hoy" : "vence mañana"}</b>: dale prioridad.
                </>
              )}
            </span>
            {st.expired ? (
              <button type="button" className="btn soft sm" onClick={() => open(<DiscardBatchForm batch={b} />)}>
                <Icon name="trash" />
                Botar
              </button>
            ) : (
              <a className="btn ghost sm" href="#insumos/vencer">Ver</a>
            )}
          </div>
        )
      })}
    </div>
  )
}

// Aviso en Insumos: ingredientes que suelen vencer pero no piden fecha. «Ya los revisé» lo
// esconde en este navegador hasta que aparezca otro (es solo una comodidad de quien lo ve).
const SEEN_KEY = "destello:vencimientos-revisados"

export function PerishableBanner() {
  const { data } = useKitchen()
  const { open } = useModal()
  const [seen, setSeen] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]") as string[]
    } catch {
      return []
    }
  })
  const missing = data.supplies.filter((s) => s.category === "INGREDIENT" && !s.perishable && perishableByDefault(s.name, s.category) && !seen.includes(s.id))
  if (!missing.length) return null
  const names = missing.slice(0, 2).map((s) => s.name).join(", ")

  return (
    <div className="callout c-peach lot-alert" style={{ marginBottom: 14 }}>
      <span>
        <b>{names}</b>
        {missing.length > 2 ? ` y ${missing.length - 2} más` : ""} suelen vencer y no piden fecha.
      </span>
      <div className="row" style={{ gap: 6 }}>
        <button type="button" className="btn soft sm" onClick={() => open(<PerishableReview suggest />)}>Revisar</button>
        <button
          type="button"
          className="btn ghost sm"
          onClick={() => {
            const next = [...seen, ...missing.map((s) => s.id)]
            setSeen(next)
            try {
              localStorage.setItem(SEEN_KEY, JSON.stringify(next))
            } catch {}
          }}
        >
          Ya los revisé
        </button>
      </div>
    </div>
  )
}
