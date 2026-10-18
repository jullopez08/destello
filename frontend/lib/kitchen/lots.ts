// Masa guardada: cuánto le queda a cada lote, lo que se ha botado y cuánta
// masa conviene preparar según lo que de verdad se vende.

import { addDays, daysBetween, requirements, weekdayOf } from "./rules"
import type { KitchenRuleData } from "./rules"
import type { DoughLot, KitchenSnapshot } from "./types"

export interface LotState {
  /** días que se puede seguir usando: 0 o menos = vencida */
  daysLeft: number
  expired: boolean
  /** para Hoy y Recetas: vencida, último día o quedan 2 días */
  warn: boolean
  label: string
}

// Ver usableLots: se usa hasta el día antes de expiresOn.
export function lotState(lot: Pick<DoughLot, "expiresOn">, today: string): LotState {
  const daysLeft = daysBetween(today, lot.expiresOn)
  if (daysLeft <= 0) return { daysLeft, expired: true, warn: true, label: "Vencida" }
  if (daysLeft === 1) return { daysLeft, expired: false, warn: true, label: "Último día" }
  return { daysLeft, expired: false, warn: daysLeft === 2, label: daysLeft === 2 ? "Quedan 2 días" : "Fresca" }
}

/** "la masa de doble chocolate": las recetas suelen llamarse ya "Masa de …". */
export function doughName(recipeName: string | undefined): string {
  const name = (recipeName ?? "").trim().toLowerCase()
  if (!name) return "masa"
  return /^masa\b/.test(name) ? name : `masa de ${name}`
}

export interface DoughInsight {
  recipeId: string
  name: string
  yieldGrams: number
  /** masa botada en las últimas 8 semanas */
  wastedGrams: number
  wastedCost: number
  /** gramos que piden los pedidos, en promedio, por día abierto (4 semanas) */
  perDay: number
  /** cuántos días dura un lote (el último que hizo; si no, 4) */
  shelfDays: number
  /** lote sugerido: lo que se usa en los días que dura la masa */
  suggestedGrams: number
  /** en tandas de la receta, de a cuartos */
  suggestedBatches: number
}

/** Una línea por cada receta que se hace por lote o que ya tuvo masa botada. */
export function doughInsights(data: KitchenSnapshot, rules: KitchenRuleData): DoughInsight[] {
  const today = data.today
  const since28 = addDays(today, -27)
  const since56 = addDays(today, -55)
  const lotProducts = data.products.filter((p) => p.mode === "LOT")

  // Gramos de masa que pidieron los pedidos de las últimas 4 semanas, solo de productos por lote.
  const lines = data.orders.filter((o) => o.status !== "CANCELLED" && o.productionDate >= since28 && o.productionDate <= today).flatMap((o) => o.lines)
  const req = requirements(lines, rules)
  let openDays = 0
  for (let d = since28; d <= today; d = addDays(d, 1)) if (!data.settings.closedDays.includes(weekdayOf(d))) openDays++

  const ids = new Set([...lotProducts.map((p) => p.recipeId), ...data.waste.map((w) => w.recipeId)])
  return data.recipes
    .filter((r) => ids.has(r.id))
    .map((r) => {
      const used = lotProducts.filter((p) => p.recipeId === r.id).reduce((a, p) => a + (req.unitGrams[p.id] ?? 0), 0)
      const waste = data.waste.filter((w) => w.recipeId === r.id && w.date >= since56)
      const last = data.lots.filter((l) => l.recipeId === r.id).sort((a, b) => b.madeOn.localeCompare(a.madeOn))[0]
      const shelfDays = last ? Math.max(1, daysBetween(last.madeOn, last.expiresOn)) : 4
      const perDay = openDays ? used / openDays : 0
      const suggestedGrams = perDay * shelfDays
      return {
        recipeId: r.id,
        name: r.name,
        yieldGrams: r.yieldGrams,
        wastedGrams: waste.reduce((a, w) => a + w.grams, 0),
        wastedCost: waste.reduce((a, w) => a + w.cost, 0),
        perDay,
        shelfDays,
        suggestedGrams,
        suggestedBatches: r.yieldGrams > 0 ? Math.ceil((suggestedGrams / r.yieldGrams) * 4) / 4 : 0,
      }
    })
    .sort((a, b) => b.wastedCost - a.wastedCost || a.name.localeCompare(b.name))
}

/** Lo que se vende hecho con esta masa (cajas, por unidad o por tamaño). */
export function presentationsWithRecipe(data: KitchenSnapshot, recipeId: string): string[] {
  const products = new Set(data.products.filter((p) => p.recipeId === recipeId).map((p) => p.id))
  return data.presentations.filter((p) => p.items.some((i) => products.has(i.productId))).map((p) => p.id)
}
