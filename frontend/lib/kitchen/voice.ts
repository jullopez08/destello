import { byId, orderSubtotal, pendingFor, planFor } from "./store"
import { addDays, presentationHealth } from "./rules"
import { fmtN, grams } from "./format"
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

// Peso de cada pieza: en sabor y tamaño depende del molde, así que sale del plan.
const pieceGrams = (plan: { units: Record<string, number>; unitGrams: Record<string, number> }, id: string, fallback: number) =>
  plan.units[id] ? Math.round((plan.unitGrams[id] ?? 0) / plan.units[id]) || fallback : fallback

export function productionAnswer(data: KitchenSnapshot, rules: KitchenRuleData, tomorrow = false): string {
  const day = tomorrow ? addDays(data.today, 1) : data.today
  const when = tomorrow ? "Mañana" : "Hoy"
  const pend = pendingFor(data, day)
  if (!pend.length) return `${when} no tienes pedidos pendientes por producir.`

  const plan = planFor(rules, pend)
  const pieces = Object.entries(plan.units)
    .map(([productId, count]) => ({ product: byId(data.products, productId), count }))
    .filter((x) => x.product && x.count > 0)
    .map(({ product, count }) => `${count} ${pluralName(product!.name, count)} de ${grams(pieceGrams(plan, product!.id, product!.grams))}`)

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

/** Dinero para leer en voz alta: "12.000 pesos" (con "$" la voz dice "dólares"). */
const pesos = (n: number) => `${fmtN(Math.round(n))} pesos`

const ANALYTICS_WEEKS = 8

/** Repartidores en su orden (el primero es el principal) con sus envíos de las últimas 8 semanas. */
function couriersAnswer(data: KitchenSnapshot): string {
  if (!data.couriers.length) return "No tienes repartidores. Agrégalos en Configuración."
  const since = addDays(data.today, -7 * ANALYTICS_WEEKS)
  const trips: Record<string, number> = {}
  for (const o of data.orders) {
    if (o.courierId && o.orderedOn > since && (o.status === "ON_THE_WAY" || o.status === "DELIVERED")) trips[o.courierId] = (trips[o.courierId] ?? 0) + 1
  }
  const ordered = [...data.couriers].sort((a, b) => a.position - b.position)
  const [main, ...rest] = ordered
  const sentences = [`Tu repartidor principal es ${main.name}.`]
  if (rest.length) sentences.push(`Después siguen ${joinList(rest.map((c) => c.name))}.`)
  const busiest = ordered.map((c) => ({ c, n: trips[c.id] ?? 0 })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n)
  sentences.push(
    busiest.length
      ? `En las últimas ${ANALYTICS_WEEKS} semanas: ${joinList(busiest.map(({ c, n }) => `${c.name} llevó ${n} ${n === 1 ? "pedido" : "pedidos"}`))}.`
      : `En las últimas ${ANALYTICS_WEEKS} semanas no han llevado pedidos.`,
  )
  return sentences.join(" ")
}

/** Unidades vendidas por presentación en las últimas 8 semanas, de más a menos. */
function salesRanking(data: KitchenSnapshot) {
  const since = addDays(data.today, -7 * ANALYTICS_WEEKS)
  const units: Record<string, number> = {}
  for (const o of data.orders) {
    if (o.status === "CANCELLED" || o.orderedOn <= since) continue
    for (const l of o.lines) units[l.presentationId] = (units[l.presentationId] ?? 0) + l.qty
  }
  return data.presentations
    .filter((p) => p.active || units[p.id])
    .map((p) => ({ name: p.name.toLowerCase(), n: units[p.id] ?? 0 }))
    .sort((a, b) => b.n - a.n)
}

const sold = (x: { name: string; n: number }) => `${x.name} (${x.n === 0 ? "ninguna venta" : `${x.n} ${x.n === 1 ? "venta" : "ventas"}`})`

/** Los que menos se venden y los que no dejan ganancia (lo mismo que muestra Analítica). */
function weakProductsAnswer(data: KitchenSnapshot, rules: KitchenRuleData, onlyMargin = false): string {
  const ranking = salesRanking(data)
  if (!ranking.length) return "Todavía no tienes productos a la venta."
  const least = ranking.slice(-3).reverse()
  const flagged = data.presentations
    .filter((p) => p.active)
    .map((p) => ({ p, h: presentationHealth(p, rules, data.settings.targetMargin) }))
    .filter((x) => x.h.kind !== "ok")
  const sentences = onlyMargin ? [] : [`En las últimas ${ANALYTICS_WEEKS} semanas, los que menos se venden son: ${joinList(least.map(sold))}.`]
  const losing = flagged.filter((x) => x.h.kind === "bad").map((x) => x.p.name.toLowerCase())
  const low = flagged.filter((x) => x.h.kind === "warn").map((x) => x.p.name.toLowerCase())
  if (losing.length) sentences.push(`Pierden dinero: ${joinList(losing)}.`)
  if (low.length) sentences.push(`Tienen margen bajo: ${joinList(low)}.`)
  if (flagged.length) sentences.push("En Analítica ves el precio sugerido para cada uno.")
  else sentences.push("Todos dejan buena ganancia.")
  return sentences.join(" ")
}

function bestProductsAnswer(data: KitchenSnapshot): string {
  const top = salesRanking(data).filter((x) => x.n > 0).slice(0, 3)
  if (!top.length) return `No hay ventas en las últimas ${ANALYTICS_WEEKS} semanas.`
  return `En las últimas ${ANALYTICS_WEEKS} semanas, lo que más se vende es: ${joinList(top.map(sold))}.`
}

/** Ventas sin domicilios: esta semana (7 días) y las últimas 4 semanas. */
function salesAnswer(data: KitchenSnapshot): string {
  const live = data.orders.filter((o) => o.status !== "CANCELLED")
  const total = (days: number) => live.filter((o) => o.orderedOn > addDays(data.today, -days)).reduce((a, o) => a + orderSubtotal(o), 0)
  const today = live.filter((o) => o.orderedOn === data.today).reduce((a, o) => a + orderSubtotal(o), 0)
  return `Hoy llevas ${pesos(today)} en ventas. En los últimos 7 días, ${pesos(total(7))}, y en las últimas 4 semanas, ${pesos(total(28))}, sin contar domicilios.`
}

const HELP =
  "No te entendí. Puedo decirte qué hornear hoy o mañana, cuántas galletas de un sabor, qué insumos faltan, " +
  "cuántos pedidos tienes, qué hay por entregar, quiénes son tus repartidores, cuánto has vendido, " +
  "qué se vende más y qué productos rinden menos."

export function answerQuestion(question: string, data: KitchenSnapshot, rules: KitchenRuleData): string {
  const q = normalizeSpeech(question)
  const tomorrow = wantsTomorrow(q)
  const day = tomorrow ? addDays(data.today, 1) : data.today
  const when = tomorrow ? "Mañana" : "Hoy"
  const pend = pendingFor(data, day)
  const plan = planFor(rules, pend)

  // Antes que "entregas": "domiciliario" también empieza por "domicili"
  if (/(repartidor|domiciliari|mensajer|motorizad)/.test(q)) return couriersAnswer(data)

  // "Ganancia" o "margen" solo pregunta por la plata; "rendimiento" o "peores", también por lo que menos se vende
  const aboutMargin = /(perdida|pierd|ganancia|margen)/.test(q)
  if (aboutMargin || /(rendimiento|rinde|rinden|menos se vend|menos vend|vendo menos|se venden menos|menos salida|no se vende|peor)/.test(q)) {
    return weakProductsAnswer(data, rules, aboutMargin && !/(rendimiento|rinde|rinden|menos|peor)/.test(q))
  }
  if (/(mas se vend|mas vend|vendo mas|mejor|mas salida|favorito|mas pedid|mas piden)/.test(q)) return bestProductsAnswer(data)
  if (/\b(vendi|vendido|vendimos|ventas|venta|facture|facturado|plata|dinero|ingres)/.test(q)) return salesAnswer(data)

  if (/\b(falta|faltan|comprar|compro|insumo|insumos)\b/.test(q)) {
    const short = plan.shortages.map((x) => byId(data.supplies, x.supplyId)?.name.toLowerCase()).filter(Boolean) as string[]
    const low = rules.supplies.filter((s) => s.stock < s.min).map((s) => s.name.toLowerCase())
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
    return `${when} toca hornear ${joinList(pieces.map(({ product, count }) => `${count} ${pluralName(product.name, count)} de ${grams(pieceGrams(plan, product.id, product.grams))}`))}.`
  }

  // El plan completo solo si la pregunta es de producción; si no, se dice qué se puede preguntar
  // (antes, cualquier pregunta desconocida recibía el plan y parecía que respondía otra cosa)
  if (/\b(hacer|hago|hornear|horneo|produc\w*|preparar|preparo|plan|toca|cocina|masa|hoy|manana|recuerdame|pendiente\w*)\b/.test(q) || !q) {
    return productionAnswer(data, rules, tomorrow)
  }
  return HELP
}
