// Vencimiento de insumos. Copia de backend/src/kitchen/supply-batches.ts (las
// reglas puras): si cambias una, cambia la otra. Aquí además los textos de cada lote.
//
// - Un lote vence al terminar su día: con fecha 20, se usa hasta el 20 y el 21 ya no.
// - Lo vencido no cuenta como disponible: ni en el plan ni al producir.

import { daysBetween } from "./dates"
import type { SupplyBatch } from "./types"

export const batchExpired = (b: Pick<SupplyBatch, "expiresOn">, today: string) => b.expiresOn < today

/** Lo que tiene el insumo sin contar lo vencido. */
export function usableStock(stock: number, batches: Pick<SupplyBatch, "left" | "expiresOn">[], today: string): number {
  const expired = batches.filter((b) => batchExpired(b, today)).reduce((a, b) => a + b.left, 0)
  return Math.max(0, stock - expired)
}

export interface BatchState {
  /** días hasta la fecha: 0 = vence hoy, negativo = vencido */
  daysLeft: number
  expired: boolean
  /** vencido o vence en 2 días o menos */
  warn: boolean
  label: string
}

export function batchState(b: Pick<SupplyBatch, "expiresOn">, today: string): BatchState {
  const daysLeft = daysBetween(today, b.expiresOn)
  if (daysLeft < 0) return { daysLeft, expired: true, warn: true, label: "Vencido" }
  const label = daysLeft === 0 ? "Vence hoy" : daysLeft === 1 ? "Vence mañana" : `Vence en ${daysLeft} días`
  return { daysLeft, expired: false, warn: daysLeft <= 2, label }
}

/** Lotes por vencer o vencidos que aún tienen algo, el más urgente primero. */
export function batchesToWatch(batches: SupplyBatch[], today: string) {
  return batches
    .filter((b) => b.left > 0)
    .map((b) => ({ b, st: batchState(b, today) }))
    .filter((x) => x.st.warn)
    .sort((a, c) => a.st.daysLeft - c.st.daysLeft)
}

// ¿Lleva fecha de vencimiento? Casi todo ingrediente la trae (leche, queso crema, huevos,
// cacao, harina, levadura…). No vencen la sal, el azúcar, el bicarbonato, la miel, el
// agua ni el vinagre, ni lo que se llama como un empaque (bolsa, caja, capacillo…). Es lo que se propone; la dueña lo cambia.
const NEVER_EXPIRES = /^(sal|azucar|bicarbonato|miel|agua|vinagre|bolsas?|cajas?|capacillos?|stickers?|etiquetas?|cintas?|papel|servilletas?|vasos?|bases?|pitillos?)\b/

export function perishableByDefault(name: string, category: "INGREDIENT" | "PACKAGING"): boolean {
  if (category === "PACKAGING") return false
  const clean = name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim()
  return !!clean && !NEVER_EXPIRES.test(clean)
}
