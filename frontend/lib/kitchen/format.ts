import type { SupplyKind } from "./rules"
import { addDays } from "./rules"

export const fmtN = (n: number, d = 0) => Number(n || 0).toLocaleString("es-CO", { maximumFractionDigits: d })
export const money = (n: number) => "$ " + fmtN(Math.round(n))

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

// Teléfono mientras se escribe: 300 000 0000 (3, 3 y 4 dígitos) para ver si
// falta alguno. Con indicativo (+57…) o más de 10 dígitos se deja como está.
export function phoneInput(v: string): string {
  if (v.trim().startsWith("+")) return v
  const d = v.replace(/\D/g, "")
  if (d.length > 10) return v
  return [d.slice(0, 3), d.slice(3, 6), d.slice(6)].filter(Boolean).join(" ")
}
