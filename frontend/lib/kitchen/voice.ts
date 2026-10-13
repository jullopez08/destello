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

// ── Preguntas dichas de distintas formas (sin IA) ──
// Se reconoce la intención por palabras clave y por los nombres de los
// productos de la cocina: "¿cuántas galletas de chocolate hago hoy?",
// "¿qué hay que hacer?", "recuérdame qué tengo que hacer", "¿qué me falta?",
// "¿cuántos pedidos tengo?", "¿qué hay por entregar?". Con "mañana" responde
// por el día siguiente. Lo que no encaje recibe el plan completo del día.

export function normalizeSpeech(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9ñ ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

const STOPWORDS = new Set([
  "de", "del", "con", "la", "el", "los", "las", "y", "x", "en", "para", "por", "un", "una", "que", "hoy", "manana",
  "cuanto", "cuantos", "cuanta", "cuantas", "tengo", "toca", "hay", "hacer", "hago", "hornear", "horneo",
  "produzco", "producir", "preparar", "debo", "me", "mi", "dime", "recuerdame",
])

const singular = (w: string) => (w.length > 4 && w.endsWith("es") ? w.slice(0, -2) : w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w)
const tokensOf = (text: string) => normalizeSpeech(text).split(" ").filter((w) => w && !STOPWORDS.has(w)).map(singular)

/** Productos que nombra la pregunta (los que más palabras comparten con ella). */
export function productsMentioned(question: string, products: { id: string; name: string }[]): string[] {
  const asked = new Set(tokensOf(question))
  if (!asked.size) return []
  const scored = products.map((p) => ({ id: p.id, score: tokensOf(p.name).filter((t) => asked.has(t)).length }))
  const best = Math.max(0, ...scored.map((x) => x.score))
  return best > 0 ? scored.filter((x) => x.score === best).map((x) => x.id) : []
}

export function answerQuestion(question: string, data: KitchenSnapshot, rules: KitchenRuleData): string {
  const q = normalizeSpeech(question)
  const tomorrow = wantsTomorrow(q)
  const day = tomorrow ? addDays(data.today, 1) : data.today
  const when = tomorrow ? "Mañana" : "Hoy"
  const pend = pendingFor(data, day)
  const plan = planFor(rules, pend)

  if (/\b(falta|faltan|comprar|compro|insumo|insumos)\b/.test(q)) {
    const short = plan.shortages.map((x) => byId(data.supplies, x.supplyId)?.name.toLowerCase()).filter(Boolean) as string[]
    const low = data.supplies.filter((s) => s.stock < s.min).map((s) => s.name.toLowerCase())
    if (short.length) return `Para producir ${tomorrow ? "mañana" : "hoy"} te falta ${joinList(short)}.`
    return low.length ? `Para producir te alcanza, pero están bajos: ${joinList(low)}.` : "Tienes todos los insumos."
  }

  if (/(entreg|en camino|domicili|repart)/.test(q)) {
    const onWay = data.orders.filter((o) => o.status === "ON_THE_WAY")
    const ready = data.orders.filter((o) => o.status === "PENDING" && o.produced)
    if (!onWay.length && !ready.length) return "No tienes pedidos por entregar."
    const parts = []
    if (ready.length) parts.push(`${ready.length} ${ready.length === 1 ? "pedido listo" : "pedidos listos"} para entregar`)
    if (onWay.length) parts.push(`${onWay.length} en camino: ${joinList(onWay.map((o) => o.customer))}`)
    return `Tienes ${joinList(parts)}.`
  }

  if (/\bpedido/.test(q) && !/\b(galleta|rollo|pan|hornear|hacer|produc)/.test(q)) {
    const all = data.orders.filter((o) => o.productionDate === day && o.status !== "CANCELLED")
    return all.length
      ? `${when} tienes ${all.length} ${all.length === 1 ? "pedido" : "pedidos"}; ${pend.length} por producir.`
      : `${when} no tienes pedidos.`
  }

  const mentioned = productsMentioned(q, data.products)
  if (mentioned.length) {
    const pieces = mentioned
      .map((id) => ({ product: byId(data.products, id)!, count: plan.units[id] ?? 0 }))
      .filter((x) => x.count > 0)
    if (!pieces.length) {
      const names = mentioned.map((id) => byId(data.products, id)!.name.toLowerCase())
      return `${when} no tienes pedidos de ${joinList(names)}.`
    }
    return `${when} toca hornear ${joinList(pieces.map(({ product, count }) => `${count} ${pluralName(product.name, count)} de ${grams(product.grams)}`))}.`
  }

  return productionAnswer(data, rules, tomorrow)
}

// ── Palabra clave "Oye Destello" ──
// El reconocimiento a veces escribe "destellos" o "de stello". Lo que va
// después de la palabra clave es la pregunta (puede llegar en el siguiente
// resultado si la persona hace una pausa).
const WAKE = /\b(?:oye|ey|hey|hola|ok)?\s*(?:destellos?|de stello|des tello)\b/

export function splitWakeWord(transcript: string): { heard: boolean; command: string } {
  const t = normalizeSpeech(transcript)
  const m = WAKE.exec(t)
  if (!m) return { heard: false, command: "" }
  return { heard: true, command: t.slice(m.index + m[0].length).trim() }
}

// ── Voz del navegador (gratis, sin servidor) ──

type Recognition = {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
}

export function createRecognition(continuous = false): Recognition | null {
  if (typeof window === "undefined") return null
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition }
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition
  if (!Ctor) return null
  const r = new Ctor()
  r.lang = "es-CO"
  r.continuous = continuous
  r.interimResults = false
  r.maxAlternatives = 1
  return r
}

export function speak(text: string, onEnd?: () => void): boolean {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  const voices = window.speechSynthesis.getVoices()
  u.voice = voices.find((v) => v.lang === "es-CO") ?? voices.find((v) => v.lang.startsWith("es")) ?? null
  u.lang = u.voice?.lang ?? "es-CO"
  u.rate = 1
  if (onEnd) {
    u.onend = onEnd
    u.onerror = onEnd
  }
  window.speechSynthesis.speak(u)
  return true
}

export function stopSpeaking() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel()
}
