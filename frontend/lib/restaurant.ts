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
export interface Floor { now: string; normalMin: number; maxMin: number; tables: FloorTable[]; catalog: CatalogItem[] }

/** Pantalla de cocina (GET /staff/kitchen). */
export interface KitchenBoard {
  now: string
  normalMin: number
  maxMin: number
  tickets: { id: string; number: number; status: TicketStatus; sentAt: string; readyAt: string | null; table: string; waiter: string | null; lines: { name: string; qty: number; note: string | null }[] }[]
  orders: { id: string; number: number; customer: string; delivery: "DELIVERY" | "PICKUP"; lines: { name: string; qty: number }[] }[]
}

export const minutesSince = (iso: string, now: number) => Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000))

/** La comanda en cocina que más lleva esperando (la que importa para avisar a la mesa). */
export function oldestWaiting(session: FloorSession | null): FloorTicket | null {
  const waiting = session?.tickets.filter((t) => t.status === "SENT") ?? []
  return waiting.sort((a, b) => a.sentAt.localeCompare(b.sentAt))[0] ?? null
}

/** ok · warn (pasó el tiempo normal) · late (pasó el máximo: avisar a la mesa). Los tiempos son de cada negocio. */
export function waitLevel(minutes: number, normalMin: number, maxMin: number): "ok" | "warn" | "late" {
  return minutes >= maxMin ? "late" : minutes >= normalMin ? "warn" : "ok"
}

/** Precio de una línea igual que en el servidor (`linePrice`): tamaño + recargo del sabor, o el precio. */
export function catalogPrice(item: CatalogItem, productId?: string, sizeId?: string): number {
  if (item.kind !== "SIZES") return item.price
  const size = item.sizes.find((s) => s.id === sizeId)
  const flavor = item.items.find((i) => i.productId === productId)
  return (size?.price ?? item.price) + (flavor?.surcharge ?? 0)
}
