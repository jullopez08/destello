import { byId, pendingFor, planFor } from "./store"
import { addDays } from "./rules"
import { grams } from "./format"
import type { KitchenSnapshot } from "./types"
import type { KitchenRuleData } from "./rules"

// "¿Cuánto produzco hoy?": la respuesta sale del plan de producción (sin IA).
// Habla en piezas y peso de cada pieza ("30 galletas con chips de 20 g"),
// que es como se cuenta en la cocina, y luego la masa por hacer y lo que falta.

/** Plural de la primera palabra: galleta → galletas, pan → panes, rollo → rollos. */
export function pluralName(name: string, count: number): string {
  const lower = name.trim().toLowerCase()
  if (count === 1) return lower
  const [first, ...rest] = lower.split(" ")
  const plural = /[aeiouáéó]$/.test(first) ? `${first}s` : /z$/.test(first) ? `${first.slice(0, -1)}ces` : `${first}es`
  return [plural, ...rest].join(" ")
}

function joinList(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? ""
  return `${parts.slice(0, -1).join(", ")} y ${parts[parts.length - 1]}`
}

/** ¿Pregunta por mañana? Si no, se responde por hoy. */
export function wantsTomorrow(question: string): boolean {
  return /ma[ñn]ana/i.test(question)
}

export function productionAnswer(data: KitchenSnapshot, rules: KitchenRuleData, tomorrow = false): string {
  const day = tomorrow ? addDays(data.today, 1) : data.today
  const when = tomorrow ? "Mañana" : "Hoy"
  const pend = pendingFor(data, day)
  if (!pend.length) return `${when} no tienes pedidos pendientes por producir.`

  const plan = planFor(rules, pend)
  const pieces = Object.entries(plan.units)
    .map(([productId, count]) => ({ product: byId(data.products, productId), count }))
    .filter((x) => x.product && x.count > 0)
    .map(({ product, count }) => `${count} ${pluralName(product!.name, count)} de ${grams(product!.grams)}`)

  const dough = plan.doughRows
    .filter((d) => d.toMake > 0)
    .map((d) => `${grams(d.toMake)} de ${byId(data.recipes, d.recipeId)?.name.toLowerCase() ?? "masa"}`)
  const short = plan.shortages.map((x) => byId(data.supplies, x.supplyId)?.name.toLowerCase()).filter(Boolean) as string[]

  const sentences = [
    `${when} tienes ${pend.length} ${pend.length === 1 ? "pedido" : "pedidos"}.`,
    `Toca hornear ${joinList(pieces)}.`,
    dough.length ? `De masa tienes que hacer ${joinList(dough)}; el resto sale de los lotes.` : "Toda la masa sale de los lotes que ya tienes.",
    short.length ? `Ojo: te falta ${joinList(short)}.` : "Tienes todos los insumos.",
  ]
  return sentences.join(" ")
}

// ── Voz del navegador (gratis, sin servidor) ──

type Recognition = {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
}

export function createRecognition(): Recognition | null {
  if (typeof window === "undefined") return null
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition }
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition
  if (!Ctor) return null
  const r = new Ctor()
  r.lang = "es-CO"
  r.interimResults = false
  r.maxAlternatives = 1
  return r
}

export function speak(text: string): boolean {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  const voices = window.speechSynthesis.getVoices()
  u.voice = voices.find((v) => v.lang === "es-CO") ?? voices.find((v) => v.lang.startsWith("es")) ?? null
  u.lang = u.voice?.lang ?? "es-CO"
  u.rate = 1
  window.speechSynthesis.speak(u)
  return true
}

export function stopSpeaking() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel()
}
