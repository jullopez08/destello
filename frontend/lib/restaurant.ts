// Restaurante: tipos del salón (GET /staff/floor) y reglas del reloj de cada comanda.

export type TicketStatus = "SENT" | "READY" | "SERVED" | "CANCELLED"
export interface FloorTicket { id: string; number: number; status: TicketStatus; sentAt: string; readyAt: string | null; lines: { name: string; qty: number; unitPrice: number; note: string | null }[] }
export interface FloorSession { id: string; openedAt: string; billAt: string | null; waiter: string | null; mine: boolean; total: number; tickets: FloorTicket[] }
export interface FloorTable { id: string; name: string; session: FloorSession | null }
export interface CatalogItem {
  id: string
  name: string
  kind: "BOX" | "UNIT" | "SIZES"
  price: number
  items: { productId: string; name: string; surcharge: number }[]
  sizes: { id: string; name: string; price: number }[]
}
export interface PayKey { id: string; bank: string; type: string; number: string; owner: string }
export interface Floor { now: string; normalMin: number; maxMin: number; taxRate: number; cashier: boolean; tables: FloorTable[]; catalog: CatalogItem[]; payKeys: PayKey[]; cancelled?: CancelledTicket[] }
/** Comanda anulada en los últimos 30 días (solo la dueña las ve, en Caja) */
export interface CancelledTicket { id: string; number: number; table: string; by: string | null; reason: CancelReason | null; sentAt: string; at: string; reviewedAt: string | null; lines: { name: string; qty: number }[]; total: number }

/** Por qué se anula una comanda. Copia de CANCEL_REASONS en backend/src/restaurant/cancel-reasons.ts. */
export type CancelReason = "LEFT" | "MISTAKE" | "SLOW" | "SOLD_OUT" | "OTHER"
export const CANCEL_REASON_LABELS: Record<CancelReason, string> = {
  LEFT: "El cliente se fue",
  MISTAKE: "Se pidió por error",
  SLOW: "Se demoró mucho",
  SOLD_OUT: "Se acabó",
  OTHER: "Otro",
}

/** Cómo va una mesa, para su color en el mapa (Julieth, 2026-10-20). */
export type TableStage = "free" | "new" | "kitchen" | "ready" | "served" | "bill"
export const STAGES: { stage: TableStage; label: string }[] = [
  { stage: "free", label: "Libre" },
  { stage: "new", label: "Sin pedir" },
  { stage: "kitchen", label: "En cocina" },
  { stage: "ready", label: "Para llevar" },
  { stage: "served", label: "Servida" },
  { stage: "bill", label: "Cuenta" },
]

export function tableStage(s: FloorSession | null): TableStage {
  if (!s) return "free"
  // Con todo anulado no hay cuenta que cobrar: solo liberarla.
  if (s.billAt && s.tickets.length) return "bill"
  if (s.tickets.some((k) => k.status === "SENT")) return "kitchen"
  if (s.tickets.some((k) => k.status === "READY")) return "ready"
  return s.tickets.length ? "served" : "new"
}

export type PayMethod = "CASH" | "TRANSFER" | "CARD"
export const PAY_METHODS: { method: PayMethod; label: string }[] = [
  { method: "CASH", label: "Efectivo" },
  { method: "TRANSFER", label: "Transferencia" },
  { method: "CARD", label: "Tarjeta" },
]

/** Propina sugerida del 10 %, igual que `tipFor` en backend/src/restaurant/bill-rules.ts. */
export const TIP_PERCENT = 10
/** Ley 1935 de 2018: máximo el 10 % del servicio sin impuestos, redondeado hacia abajo. */
export const tipFor = (subtotal: number, taxRate = 0) => Math.floor((subtotal / (1 + taxRate)) * TIP_PERCENT / 100 + 1e-6)

/** Pantalla de cocina (GET /staff/kitchen). */
export interface KitchenBoard {
  now: string
  normalMin: number
  maxMin: number
  tickets: { id: string; number: number; status: TicketStatus; sentAt: string; readyAt: string | null; table: string; waiter: string | null; lines: { name: string; qty: number; note: string | null }[] }[]
  today: string
  orders: BoardOrder[]
  /** Lo del siguiente día de producción (pasado el corte, o tras un día cerrado). */
  next: { date: string; orders: BoardOrder[] } | null
}
export interface BoardOrder { id: string; number: number; customer: string; delivery: "DELIVERY" | "PICKUP"; lines: { name: string; qty: number }[] }

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
