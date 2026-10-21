"use client"

import { useState } from "react"
import { Icon } from "@/components/ui/icon"
import { Modal } from "@/components/ui/modal"
import { HELP } from "@/lib/kitchen/help"
import { toIsoDate } from "@/lib/kitchen/dates"
import { Field, useModal } from "./shared"

export type ReportKind = "caja" | "contador" | "pedidos" | "inventario" | "compras"

const TITLES: Record<ReportKind, [string, string]> = {
  caja: ["Cierre de caja", "Lo cobrado cada día por forma de pago, propinas, anuladas y cada cobro."],
  contador: ["Ventas para el contador", "Ventas sin impuesto, el impuesto y las propinas aparte, por día y por bimestre."],
  pedidos: ["Pedidos", "Cada pedido con su cliente, productos, valor y estado."],
  inventario: ["Inventario", "Lo que hay hoy con su valor y lo que vence. Las fechas son para lo botado."],
  compras: ["Compras", "Cada compra y el total por proveedor."],
}

const day = (d: Date) => toIsoDate(d)
const monthStart = (y: number, m: number) => new Date(y, m, 1)
const monthEnd = (y: number, m: number) => new Date(y, m + 1, 0)

// Atajos: el bimestre anterior es el último periodo del impuesto al consumo ya cerrado (ene-feb, mar-abr…).
function shortcuts(now = new Date()): [string, string, string][] {
  const y = now.getFullYear()
  const m = now.getMonth()
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  const bimester = m - (m % 2) - 2
  return [
    ["Hoy", day(now), day(now)],
    ["Esta semana", day(monday), day(now)],
    ["Este mes", day(monthStart(y, m)), day(now)],
    ["Mes pasado", day(monthStart(y, m - 1)), day(monthEnd(y, m - 1))],
    ["Bimestre anterior", day(monthStart(y, bimester)), day(monthEnd(y, bimester + 1))],
  ]
}

// «Descargar Excel» de cada sección (Julieth, 2026-10-21): se elige desde qué fecha y hasta cuál.
export function ReportButton({ kind, label = "Descargar Excel" }: { kind: ReportKind; label?: string }) {
  const { open } = useModal()
  return (
    <button type="button" className="btn soft" onClick={() => open(<ReportForm kind={kind} />)}>
      <Icon name="download" />
      {label}
    </button>
  )
}

function ReportForm({ kind }: { kind: ReportKind }) {
  const { close } = useModal()
  const presets = shortcuts()
  const [range, setRange] = useState({ from: presets[2][1], to: presets[2][2] })
  const [title, sub] = TITLES[kind]

  async function download() {
    if (!range.from || !range.to) throw new Error("Elige desde qué fecha y hasta cuál.")
    if (range.from > range.to) throw new Error("La fecha «Desde» debe ser antes de «Hasta».")
    const response = await fetch(`/api/kitchen/reports/${kind}?from=${range.from}&to=${range.to}`, { credentials: "same-origin" })
    if (!response.ok) {
      const body = await response.json().catch(() => null)
      throw new Error(body?.message ?? "No se pudo armar el Excel. Inténtalo de nuevo.")
    }
    const name = /filename="([^"]+)"/.exec(response.headers.get("Content-Disposition") ?? "")?.[1] ?? `${kind}.xlsx`
    const url = URL.createObjectURL(await response.blob())
    const link = document.createElement("a")
    link.href = url
    link.download = name
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    close()
  }

  return (
    <Modal title={title} sub={sub} submit="Descargar" busyText="Armando el Excel…" onClose={close} onSubmit={download}>
      <div className="seg report-presets">
        {presets.map(([label, from, to]) => (
          <label key={label}>
            <input type="radio" name="report-preset" checked={range.from === from && range.to === to} onChange={() => setRange({ from, to })} />
            <span>{label}</span>
          </label>
        ))}
      </div>
      <div className="grid g2">
        <Field label="Desde" help={HELP.reportFrom}>
          <input type="date" value={range.from} max={range.to || undefined} onChange={(e) => setRange({ ...range, from: e.target.value })} />
        </Field>
        <Field label="Hasta" help={HELP.reportTo}>
          <input type="date" value={range.to} min={range.from || undefined} onChange={(e) => setRange({ ...range, to: e.target.value })} />
        </Field>
      </div>
    </Modal>
  )
}
