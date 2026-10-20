// Restaurante: tipos del salón (GET /staff/floor) y reglas del reloj de cada comanda.

export type TicketStatus = "SENT" | "READY" | "SERVED"
export interface FloorTicket { id: string; number: number; status: TicketStatus; sentAt: string; readyAt: string | null; lines: { name: string; qty: number; note: string | null }[] }
export interface FloorSession { id: string; openedAt: string; waiter: string | null; mine: boolean; total: number; tickets: FloorTicket[] }
export interface FloorTable { id: string; name: string; session: FloorSession | null }
export interface CatalogItem {
  id: string
  name: string
  kind: "BOX" | "UNIT" | "SIZES"
  price: number
  items: { productId: string; name: string; surcharge: number }[]
  sizes: { id: string; name: string; price: number }[]
}
export interface Floor { now: string; tables: FloorTable[]; catalog: CatalogItem[] }

/** Tiempos de espera por ahora fijos; en `feature/pantalla-cocina` cada negocio pone los suyos. */
export const WAIT_NORMAL_MIN = 15
export const WAIT_MAX_MIN = 25

export const minutesSince = (iso: string, now: number) => Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000))

/** La comanda en cocina que más lleva esperando (la que importa para avisar a la mesa). */
export function oldestWaiting(session: FloorSession | null): FloorTicket | null {
  const waiting = session?.tickets.filter((t) => t.status === "SENT") ?? []
  return waiting.sort((a, b) => a.sentAt.localeCompare(b.sentAt))[0] ?? null
}

/** ok · warn (pasó el tiempo normal) · late (pasó el máximo: avisar a la mesa). */
export function waitLevel(minutes: number): "ok" | "warn" | "late" {
  return minutes >= WAIT_MAX_MIN ? "late" : minutes >= WAIT_NORMAL_MIN ? "warn" : "ok"
}

/** Precio de una línea igual que en el servidor (`linePrice`): tamaño + recargo del sabor, o el precio. */
export function catalogPrice(item: CatalogItem, productId?: string, sizeId?: string): number {
  if (item.kind !== "SIZES") return item.price
  const size = item.sizes.find((s) => s.id === sizeId)
  const flavor = item.items.find((i) => i.productId === productId)
  return (size?.price ?? item.price) + (flavor?.surcharge ?? 0)
}
