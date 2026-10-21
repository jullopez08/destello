// Forma de GET /kitchen (backend: KitchenSnapshotService.load).
// Cantidades en g, ml o und; dinero en pesos; días "AAAA-MM-DD".

import type { SalesTax, SupplyKind } from "./rules"

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
  /** "¿Atiendes clientes en mesas?": enciende mesas y meseros */
  servesTables: boolean
  /** Minutos que suele tardar un plato y el máximo antes de avisar a la mesa */
  kitchenNormalMin: number
  kitchenMaxMin: number
  /** Impuesto incluido en los precios (Configuración → El negocio) */
  salesTax: SalesTax
  /** false: el panel solo muestra los primeros pasos (setup-view) */
  setupDone: boolean
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
  /** Último precio tal como se escribió: lo pagado (pesos) por tanta cantidad (g, ml o und); null en los viejos */
  pricePaid: number | null
  priceQty: number | null
  /** tiene fecha de vencimiento: cada compra pide la fecha y queda como un lote */
  perishable: boolean
  supplierId: string | null
}

/** Lo que entró de un insumo con vencimiento y aún queda (también lo vencido). Lo que no está en lotes no tiene fecha. */
export interface SupplyBatch { id: string; supplyId: string; qty: number; left: number; expiresOn: string; receivedOn: string }
/** Insumo botado: cantidad, lo que costó (pesos) y el día */
export interface SupplyWaste { id: string; supplyId: string; qty: number; cost: number; date: string }

export interface Purchase { id: string; date: string; supplierId: string | null; lines: { supplyId: string; qty: number; total: number }[] }
export interface Recipe { id: string; name: string; yieldGrams: number; color: CardColor; items: { supplyId: string; qty: number }[] }
export interface DoughLot { id: string; recipeId: string; grams: number; left: number; madeOn: string; expiresOn: string }
/** Masa botada: gramos, lo que costó (pesos) y el día */
export interface DoughWaste { id: string; recipeId: string; grams: number; cost: number; date: string }

export interface Product {
  id: string
  name: string
  mode: "LOT" | "ON_DEMAND"
  recipeId: string
  grams: number
  look: CookieLook
  /** por unidad: un insumo, o una receta propia (relleno hecho) en gramos */
  extras: { supplyId?: string | null; recipeId?: string | null; qty: number }[]
}

/** BOX: caja armada · UNIT: por unidad · SIZES: sabor y tamaño */
export type SaleKind = "BOX" | "UNIT" | "SIZES"

export interface PresentationSize {
  id: string
  name: string
  portions: string
  mold: string
  price: number
  /** gramos de masa por molde; 0 = los del producto */
  grams: number
  packSupplyId: string | null
}

export interface Presentation {
  id: string
  name: string
  kind: SaleKind
  /** BOX: la caja · UNIT: por unidad · SIZES: el tamaño más barato */
  price: number
  active: boolean
  /** BOX: lo que lleva · UNIT y SIZES: los sabores (con recargo en SIZES) */
  items: { productId: string; units: number; surcharge: number }[]
  /** BOX: por caja · UNIT: el de siempre, uno por pedido */
  pack: { supplyId: string; qty: number }[]
  sizes: PresentationSize[]
}

export interface OrderLine {
  orderId: string
  presentationId: string
  qty: number
  unitPrice: number
  productId: string | null
  sizeId: string | null
  packSupplyId: string | null
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
  lines: OrderLine[]
}

export interface Edition {
  id: string
  name: string
  description: string | null
  startDate: string
  endDate: string
  look: CookieLook
  color: CardColor
  presentationIds: string[]
}

/** Analítica de los meseros (últimas 4 semanas): mesas por día de trabajo. */
export interface WaiterStat { id: string; name: string; tables: number; days: number; perDay: number; avgSale: number; tips: number }

/** Lo vendido en mesas cobradas, resumido por día y plato (sin propina); `days` dice cuántas mesas por día. */
export interface TableSales {
  days: { date: string; tables: number }[]
  lines: { date: string; presentationId: string; productId: string | null; sizeId: string | null; unitPrice: number; qty: number }[]
}
/** Minutos promedio en cocina de la comanda de cada plato (4 semanas). */
export interface DishTime { presentationId: string; productId: string | null; minutes: number; count: number }

export interface KitchenSnapshot {
  today: string
  nextProductionDate: string
  settings: KitchenSettings
  /** Vacío si el negocio no atiende en mesas */
  waiters: WaiterStat[]
  tableSales: TableSales
  dishTimes: DishTime[]
  accounts: BankAccount[]
  couriers: Courier[]
  suppliers: Supplier[]
  /** existencia total, también lo vencido (las reglas usan solo lo que sirve) */
  supplies: Supply[]
  supplyBatches: SupplyBatch[]
  supplyWaste: SupplyWaste[]
  purchases: Purchase[]
  recipes: Recipe[]
  /** toda la masa guardada, también la vencida (las reglas solo usan la que sirve) */
  lots: DoughLot[]
  waste: DoughWaste[]
  products: Product[]
  presentations: Presentation[]
  orders: Order[]
  editions: Edition[]
  checks: Record<string, Record<string, boolean>>
}
