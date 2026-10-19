// Vencimiento de insumos (Julieth, 2026-10-17): un insumo marcado «tiene fecha de
// vencimiento» guarda cada compra como un lote con su cantidad y su fecha. Lo que
// no tiene fecha (existencia de antes o insumos sin vencimiento) es el resto:
// stock − lo que queda en los lotes, y nunca vence.
//
// - Un lote vence al terminar su día: con fecha 20, se usa hasta el 20 y el 21 ya no.
// - Lo vencido no cuenta como disponible: ni en el plan ni al producir.
// - Se gasta primero el lote que vence antes (FEFO) y después lo que no tiene fecha.
// Copia en frontend/lib/kitchen/batches.ts: si cambias una, cambia la otra.

import { Prisma } from '@prisma/client';

export interface BatchLike {
  id: string;
  left: number;
  expiresOn: string;
}

export const batchExpired = (b: Pick<BatchLike, 'expiresOn'>, today: string) => b.expiresOn < today;

/** Lo que tiene el insumo sin contar lo vencido. */
export function usableStock(stock: number, batches: BatchLike[], today: string): number {
  const expired = batches.filter((b) => batchExpired(b, today)).reduce((a, b) => a + b.left, 0);
  return Math.max(0, stock - expired);
}

/** Cuánto sale de cada lote al gastar `amount`: primero los que vencen antes; lo que sobre sale de lo que no tiene fecha. */
export function takeFromBatches(batches: BatchLike[], amount: number, today: string): { id: string; used: number }[] {
  const out: { id: string; used: number }[] = [];
  let rest = amount;
  for (const b of [...batches].filter((x) => !batchExpired(x, today)).sort((a, c) => a.expiresOn.localeCompare(c.expiresOn))) {
    if (rest <= 1e-9) break;
    const used = Math.min(b.left, rest);
    if (used > 0) out.push({ id: b.id, used });
    rest -= used;
  }
  return out;
}

/** Si la existencia se corrige a mano por debajo de lo que hay en lotes, los lotes bajan (primero los que vencen antes). */
export function trimBatches(batches: BatchLike[], stock: number): { id: string; used: number }[] {
  const inBatches = batches.reduce((a, b) => a + b.left, 0);
  if (inBatches <= stock + 1e-9) return [];
  const out: { id: string; used: number }[] = [];
  let rest = inBatches - stock;
  for (const b of [...batches].sort((a, c) => a.expiresOn.localeCompare(c.expiresOn))) {
    if (rest <= 1e-9) break;
    const used = Math.min(b.left, rest);
    out.push({ id: b.id, used });
    rest -= used;
  }
  return out;
}

/** Gasta `amount` de un insumo: baja la existencia y los lotes que tocan, y borra los lotes vacíos. */
export async function consumeSupply(tx: Prisma.TransactionClient, supplyId: string, amount: number, today: string) {
  if (amount <= 0) return;
  const batches = await tx.supplyBatch.findMany({ where: { supplyId } });
  await tx.supply.update({ where: { id: supplyId }, data: { stock: { decrement: amount } } });
  await applyTakes(tx, takeFromBatches(batches, amount, today));
}

export async function applyTakes(tx: Prisma.TransactionClient, takes: { id: string; used: number }[]) {
  for (const t of takes) await tx.supplyBatch.update({ where: { id: t.id }, data: { left: { decrement: t.used } } });
  if (takes.length) await tx.supplyBatch.deleteMany({ where: { id: { in: takes.map((t) => t.id) }, left: { lte: 1e-6 } } });
}

// ¿Lleva fecha de vencimiento? Casi todo ingrediente la trae (leche, queso crema, huevos,
// cacao, harina, levadura…). No vencen la sal, el azúcar, el bicarbonato, la miel, el
// agua ni el vinagre, ni lo que se llama como un empaque (bolsa, caja, capacillo…). Es lo que se propone; la dueña lo cambia.
const NEVER_EXPIRES = /^(sal|azucar|bicarbonato|miel|agua|vinagre|bolsas?|cajas?|capacillos?|stickers?|etiquetas?|cintas?|papel|servilletas?|vasos?|bases?|pitillos?)\b/;

export function perishableByDefault(name: string, category: 'INGREDIENT' | 'PACKAGING'): boolean {
  if (category === 'PACKAGING') return false;
  const clean = name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  return !!clean && !NEVER_EXPIRES.test(clean);
}
