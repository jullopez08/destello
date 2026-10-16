// Cálculos de Analítica. Todo sale de los pedidos no cancelados y del costo
// actual de cada cosa (la ganancia es aproximada: usa el costo de hoy).

import { addDays, presentationCost, productCost } from "./rules"
import type { KitchenRuleData } from "./rules"
import type { KitchenSnapshot, Order, OrderLine } from "./types"

export interface Period {
  start: string
  end: string
  sales: number
  profit: number
  orders: number
}

export interface WeekStat {
  start: string
  end: string
  sales: number
  orders: number
  current: boolean
}

export interface Seller {
  id: string
  name: string
  units: number
  sales: number
  share: number
}

const byId = <T extends { id: string }>(list: T[], id: string | null | undefined) => list.find((x) => x.id === id)

// Lo que cuesta hacer una línea del pedido, según cómo se vende.
export function lineCost(line: OrderLine, rules: KitchenRuleData): number {
  const p = byId(rules.presentations, line.presentationId)
  if (!p) return 0
  const product = byId(rules.products, line.productId)
  if (p.kind === "UNIT") return (product ? productCost(product, rules) : 0) * line.qty
  if (p.kind === "SIZES") {
    const size = byId(p.sizes ?? [], line.sizeId)
    const pack = byId(rules.supplies, size?.packSupplyId)?.cost ?? 0
    const each = product ? productCost({ ...product, grams: size?.grams || product.grams }, rules) : 0
    return (each + pack) * line.qty
  }
  return presentationCost(p, rules) * line.qty
}

const sales = (o: Order) => o.lines.reduce((a, l) => a + l.qty * l.unitPrice, 0)

function period(orders: Order[], rules: KitchenRuleData, start: string, end: string): Period {
  const list = orders.filter((o) => o.orderedOn >= start && o.orderedOn <= end)
  const total = list.reduce((a, o) => a + sales(o), 0)
  const cost = list.reduce((a, o) => a + o.lines.reduce((x, l) => x + lineCost(l, rules), 0), 0)
  return { start, end, sales: total, profit: total - cost, orders: list.length }
}

export function analytics(data: KitchenSnapshot, rules: KitchenRuleData) {
  const live = data.orders.filter((o) => o.status !== "CANCELLED")
  const today = data.today

  // Las últimas 4 semanas (hoy incluido) frente a las 4 de antes.
  const now = period(live, rules, addDays(today, -27), today)
  const before = period(live, rules, addDays(today, -55), addDays(today, -28))

  // 8 semanas de 7 días; la última termina hoy y todavía va en curso.
  const weeks: WeekStat[] = Array.from({ length: 8 }, (_, i) => {
    const end = addDays(today, -7 * (7 - i))
    const start = addDays(end, -6)
    const list = live.filter((o) => o.orderedOn >= start && o.orderedOn <= end)
    return { start, end, sales: list.reduce((a, o) => a + sales(o), 0), orders: list.length, current: i === 7 }
  })

  // Qué días de la semana hay más trabajo (por día de producción).
  const weekdays = Array.from({ length: 7 }, () => 0)
  for (const o of live) {
    if (o.productionDate < addDays(today, -55) || o.productionDate > today) continue
    weekdays[new Date(o.productionDate + "T12:00:00").getDay()] += 1
  }

  // Lo que más y lo que menos se vende en las 8 semanas.
  const units: Record<string, number> = {}
  const money: Record<string, number> = {}
  for (const o of live) {
    if (o.orderedOn < addDays(today, -55)) continue
    for (const l of o.lines) {
      units[l.presentationId] = (units[l.presentationId] ?? 0) + l.qty
      money[l.presentationId] = (money[l.presentationId] ?? 0) + l.qty * l.unitPrice
    }
  }
  const total8 = Object.values(money).reduce((a, b) => a + b, 0)
  const sellers: Seller[] = data.presentations
    .filter((p) => p.active || units[p.id])
    .map((p) => ({ id: p.id, name: p.name, units: units[p.id] ?? 0, sales: money[p.id] ?? 0, share: total8 ? (money[p.id] ?? 0) / total8 : 0 }))
    .sort((a, b) => b.sales - a.sales)

  return { now, before, weeks, weekdays, sellers }
}

// Cambio en porcentaje; null si antes no había nada con qué comparar.
export const change = (now: number, before: number) => (before > 0 ? Math.round(((now - before) / before) * 100) : null)
