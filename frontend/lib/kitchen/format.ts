import type { SupplyKind } from "./rules"
import { addDays } from "./rules"

export const fmtN = (n: number, d = 0) => Number(n || 0).toLocaleString("es-CO", { maximumFractionDigits: d })
// Espacio que no se parte: el "$" nunca queda solo en una línea y el número en la otra.
export const money = (n: number) => "$ " + fmtN(Math.round(n))
/** Cómo se llama el impuesto según la tarifa (0.08 al consumo, 0.19 IVA). */
export const taxName = (rate: number) => (rate >= 0.19 ? "IVA" : "impuesto al consumo")

// Cantidades en g/ml/und: desde 1000 se muestran en kg o litros.
export function qty(n: number, kind: SupplyKind | undefined): string {
  n = Number(n) || 0
  if (kind === "MASS") return Math.abs(n) >= 1000 ? fmtN(n / 1000, 2) + " kg" : fmtN(n) + " g"
  if (kind === "VOLUME") return Math.abs(n) >= 1000 ? fmtN(n / 1000, 2) + " l" : fmtN(n) + " ml"
  return fmtN(n, 1) + " und"
}
export const grams = (n: number) => qty(n, "MASS")
export const unitOf = (k: SupplyKind) => (k === "MASS" ? "g" : k === "VOLUME" ? "ml" : "und")
export const bigUnitOf = (k: SupplyKind) => (k === "MASS" ? "kg" : k === "VOLUME" ? "l" : "und")
export const factorOf = (k: SupplyKind) => (k === "UNIT" ? 1 : 1000)

export function costLabel(s: { kind: SupplyKind; cost: number }) {
  return s.kind === "UNIT" ? money(s.cost) + " / und" : money(s.cost * 1000) + (s.kind === "MASS" ? " / kg" : " / l")
}

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]
const MONTHS_LONG = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]
export const DAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"]

export function dateLabel(s: string, today: string): string {
  if (s === today) return "Hoy"
  if (s === addDays(today, 1)) return "Mañana"
  if (s === addDays(today, -1)) return "Ayer"
  const d = new Date(s + "T12:00:00")
  return d.getDate() + " " + MONTHS[d.getMonth()]
}

export function longDate(s: string): string {
  const d = new Date(s + "T12:00:00")
  return DAYS[d.getDay()] + " " + d.getDate() + " de " + MONTHS_LONG[d.getMonth()]
}

export function initials(n: string): string {
  return String(n)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
}

export const COLOR_NAMES: Record<string, string> = {
  banana: "Vainilla",
  strawberry: "Fresa",
  lilac: "Lavanda",
  peach: "Durazno",
  sky: "Cielo",
  mint: "Menta",
}

/** Celular de Colombia en grupos para leerlo fácil, "300 555 1280": solo números y como mucho 10 (Julieth,
 *  2026-10-21). Si lo pegan con el +57 adelante, se quita. */
export function phoneInput(v: string): string {
  let d = v.replace(/\D/g, "")
  if (d.length > 10 && d.startsWith("57")) d = d.slice(2)
  d = d.slice(0, 10)
  return [d.slice(0, 3), d.slice(3, 6), d.slice(6)].filter(Boolean).join(" ")
}

/** Vacío o exactamente 10 números; si no, el error para mostrar. */
export function phoneProblem(v: string, label = "El WhatsApp"): string | null {
  const n = v.replace(/\D/g, "").length
  return n === 0 || n === 10 ? null : `${label} debe tener 10 números.`
}

/** Plural de la primera palabra: galleta → galletas, pan → panes, rollo → rollos. */
export function pluralName(name: string, count: number): string {
  const lower = name.trim().toLowerCase()
  if (count === 1) return lower
  const [first, ...rest] = lower.split(" ")
  const plural = /[aeiouáéó]$/.test(first) ? `${first}s` : /z$/.test(first) ? `${first.slice(0, -1)}ces` : `${first}es`
  return [plural, ...rest].join(" ")
}
