// Forma de GET /kitchen (backend: KitchenSnapshotService.load).
// Cantidades en g, ml o und; dinero en pesos; días "AAAA-MM-DD".

import type { SupplyKind } from "./rules"

export type CardColor = "banana" | "strawberry" | "lilac" | "peach" | "sky" | "mint"
export type CookieLook = "" | "choco" | "roll" | "bread" | "pump" | "star"

export interface KitchenSettings {
  name: string
  whatsapp: string | null
  orderCutoff: string
  closedDays: number[]
  targetMargin: number
  palette: string
  logoUrl: string | null
}

export interface BankAccount { id: string; bank: string; type: string; number: string; owner: string }
export interface Courier { id: string; name: string; phone: string; position: number }

export interface Supplier {
  id: string
  name: string
  contact: string | null
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
  color: CardColor
}

export interface Supply {
  id: string
  name: string
  kind: SupplyKind
  category: "INGREDIENT" | "PACKAGING"
  stock: number
  min: number
  cost: number
  supplierId: string | null
}

export interface Purchase { id: string; date: string; supplierId: string | null; lines: { supplyId: string; qty: number; total: number }[] }
export interface Recipe { id: string; name: string; yieldGrams: number; color: CardColor; items: { supplyId: string; qty: number }[] }
export interface DoughLot { id: string; recipeId: string; grams: number; left: number; madeOn: string; expiresOn: string }

export interface Product {
  id: string
  name: string
  mode: "LOT" | "ON_DEMAND"
  recipeId: string
  grams: number
  look: CookieLook
  extras: { supplyId: string; qty: number }[]
}

export interface Presentation {
  id: string
  name: string
  price: number
  active: boolean
  items: { productId: string; units: number }[]
  pack: { supplyId: string; qty: number }[]
}

export type OrderStatus = "PENDING" | "ON_THE_WAY" | "DELIVERED" | "CANCELLED"

export interface Order {
  id: string
  number: number
  customer: string
  phone: string | null
  address: string | null
  orderedOn: string
  productionDate: string
  delivery: "DELIVERY" | "PICKUP"
  payment: "TRANSFER" | "CASH"
  fee: number
  status: OrderStatus
  produced: boolean
  courierId: string | null
  lines: { presentationId: string; qty: number; unitPrice: number }[]
}

export interface Edition {
  id: string
  name: string
  description: string | null
  startDate: string
  endDate: string
  cap: number
  look: CookieLook
  color: CardColor
  presentationIds: string[]
}

export interface KitchenSnapshot {
  today: string
  nextProductionDate: string
  settings: KitchenSettings
  accounts: BankAccount[]
  couriers: Courier[]
  suppliers: Supplier[]
  supplies: Supply[]
  purchases: Purchase[]
  recipes: Recipe[]
  lots: DoughLot[]
  products: Product[]
  presentations: Presentation[]
  orders: Order[]
  editions: Edition[]
  checks: Record<string, Record<string, boolean>>
}
