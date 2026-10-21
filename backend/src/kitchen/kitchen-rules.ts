// Reglas de la cocina, sin acceso a la base de datos. Las usan los servicios
// del backend para validar y descontar inventario, y el frontend las repite en
// `frontend/lib/kitchen/rules.ts` para mostrar lo mismo antes de guardar.
// Si cambias algo aquí, cámbialo allá también (y en kitchen-costs y kitchen-dates).
//
// Unidades: insumos por peso en g, por volumen en ml y por unidad en und.
// Dinero en pesos COP. Días como "AAAA-MM-DD".

export type SupplyKind = 'MASS' | 'VOLUME' | 'UNIT';

export interface RuleSupply {
  id: string;
  name: string;
  kind: SupplyKind;
  stock: number;
  min: number;
  cost: number;
}

export interface RuleRecipe {
  id: string;
  name: string;
  yieldGrams: number;
  items: { supplyId: string; qty: number }[];
}

export interface RuleLot {
  id: string;
  recipeId: string;
  left: number;
  expiresOn: string;
}

export interface RuleProduct {
  id: string;
  mode: 'LOT' | 'ON_DEMAND';
  recipeId: string;
  grams: number;
  /** por unidad: un insumo, o una receta propia (relleno hecho) en gramos */
  extras: { supplyId?: string | null; recipeId?: string | null; qty: number }[];
}

/** BOX: caja armada · UNIT: por unidad, la clienta elige sabores · SIZES: sabor y tamaño */
export type SaleKind = 'BOX' | 'UNIT' | 'SIZES';

export interface RuleSize {
  id: string;
  price: number;
  /** gramos de masa por molde; 0 = los del producto */
  grams: number;
  packSupplyId: string | null;
}

// En BOX `items` es lo que lleva la caja; en UNIT y SIZES, los sabores que se
// pueden elegir (con su recargo en SIZES).
export interface RulePresentation {
  id: string;
  kind?: SaleKind;
  price: number;
  items: { productId: string; units: number; surcharge?: number }[];
  pack: { supplyId: string; qty: number }[];
  sizes?: RuleSize[];
}

export interface KitchenRuleData {
  supplies: RuleSupply[];
  recipes: RuleRecipe[];
  lots: RuleLot[];
  products: RuleProduct[];
  presentations: RulePresentation[];
  /** Impuesto incluido en los precios (0, 0.08 o 0.19): el margen se calcula sin él */
  taxRate?: number;
}

export interface OrderLineInput {
  presentationId: string;
  qty: number;
  /** UNIT y SIZES: el sabor elegido */
  productId?: string | null;
  /** SIZES: el tamaño elegido */
  sizeId?: string | null;
  /** UNIT: otro empaque para este pedido */
  packSupplyId?: string | null;
  /** UNIT: el empaque va una vez por pedido */
  orderId?: string;
}

export const byId = <T extends { id: string }>(list: T[], id: string | null | undefined) => list.find((x) => x.id === id);

export function lotGrams(lots: RuleLot[], recipeId: string): number {
  return lots.filter((l) => l.recipeId === recipeId).reduce((sum, l) => sum + l.left, 0);
}

export interface Requirements {
  /** gramos de masa por receta */
  dough: Record<string, number>;
  /** insumos que se descuentan directo: empaques y extras por unidad */
  direct: Record<string, number>;
  /** unidades por producto */
  units: Record<string, number>;
  /** gramos de masa por producto (en sabor y tamaño, los del molde) */
  unitGrams: Record<string, number>;
  /** cajas por presentación */
  boxes: Record<string, number>;
}

export function requirements(lines: OrderLineInput[], data: KitchenRuleData): Requirements {
  const dough: Record<string, number> = {};
  const direct: Record<string, number> = {};
  const units: Record<string, number> = {};
  const unitGrams: Record<string, number> = {};
  const boxes: Record<string, number> = {};
  const packed = new Set<string>();
  const addDirect = (supplyId: string, qty: number) => (direct[supplyId] = (direct[supplyId] ?? 0) + qty);

  const bake = (productId: string | null | undefined, count: number, gramsEach?: number) => {
    const product = byId(data.products, productId);
    if (!product) return;
    const total = count * (gramsEach || product.grams);
    units[product.id] = (units[product.id] ?? 0) + count;
    unitGrams[product.id] = (unitGrams[product.id] ?? 0) + total;
    dough[product.recipeId] = (dough[product.recipeId] ?? 0) + total;
    for (const e of product.extras) {
      // El relleno hecho en casa se suma como masa de su receta.
      if (e.recipeId) dough[e.recipeId] = (dough[e.recipeId] ?? 0) + e.qty * count;
      else if (e.supplyId) addDirect(e.supplyId, e.qty * count);
    }
  };

  for (const line of lines) {
    const presentation = byId(data.presentations, line.presentationId);
    if (!presentation) continue;
    // Por unidad: todo lo del pedido va junto, es un solo empaque por armar.
    if (presentation.kind !== 'UNIT') boxes[presentation.id] = (boxes[presentation.id] ?? 0) + line.qty;

    if (presentation.kind === 'UNIT') {
      bake(line.productId, line.qty);
      const key = `${line.orderId ?? ''}|${presentation.id}`;
      if (packed.has(key)) continue;
      packed.add(key);
      boxes[presentation.id] = (boxes[presentation.id] ?? 0) + 1;
      if (line.packSupplyId) addDirect(line.packSupplyId, 1);
      else for (const p of presentation.pack) addDirect(p.supplyId, p.qty);
    } else if (presentation.kind === 'SIZES') {
      const size = byId(presentation.sizes ?? [], line.sizeId);
      bake(line.productId, line.qty, size?.grams);
      if (size?.packSupplyId) addDirect(size.packSupplyId, line.qty);
    } else {
      for (const p of presentation.pack) addDirect(p.supplyId, p.qty * line.qty);
      for (const item of presentation.items) bake(item.productId, item.units * line.qty);
    }
  }

  return { dough, direct, units, unitGrams, boxes };
}

export interface DoughRow {
  recipeId: string;
  need: number;
  fromLots: number;
  toMake: number;
  batches: number;
}

export interface SupplyNeed {
  supplyId: string;
  need: number;
  short: number;
}

export interface ProductionPlan extends Requirements {
  doughRows: DoughRow[];
  supplies: SupplyNeed[];
  shortages: SupplyNeed[];
}

// Plan de producción: primero se usa la masa de los lotes (solo recetas de
// productos "por lote"); lo que falta se hace con insumos.
export function productionPlan(lines: OrderLineInput[], data: KitchenRuleData): ProductionPlan {
  const req = requirements(lines, data);
  const need: Record<string, number> = { ...req.direct };
  const doughRows: DoughRow[] = [];

  for (const [recipeId, grams] of Object.entries(req.dough)) {
    const recipe = byId(data.recipes, recipeId);
    if (!recipe) continue;
    const usesLots = data.products.some((p) => p.recipeId === recipeId && p.mode === 'LOT');
    const fromLots = usesLots ? Math.min(lotGrams(data.lots, recipeId), grams) : 0;
    const toMake = grams - fromLots;
    doughRows.push({ recipeId, need: grams, fromLots, toMake, batches: recipe.yieldGrams > 0 ? toMake / recipe.yieldGrams : 0 });
    for (const item of recipe.items) {
      need[item.supplyId] = (need[item.supplyId] ?? 0) + (item.qty * toMake) / recipe.yieldGrams;
    }
  }

  const supplies = Object.entries(need)
    .filter(([supplyId]) => byId(data.supplies, supplyId))
    .map(([supplyId, qty]) => {
      const supply = byId(data.supplies, supplyId) as RuleSupply;
      return { supplyId, need: qty, short: Math.max(0, qty - supply.stock) };
    });

  return { ...req, doughRows, supplies, shortages: supplies.filter((s) => s.short > 0.0001) };
}

// Lo que sale de un insumo al usarlo: lo que se cuenta por unidad se redondea
// hacia arriba (no se usan fracciones de huevo).
export function consumedAmount(kind: SupplyKind, qty: number): number {
  return kind === 'UNIT' ? Math.ceil(qty - 1e-9) : qty;
}

// Costo promedio ponderado después de una compra.
export function averageCostAfterPurchase(stock: number, cost: number, qty: number, total: number): number {
  const before = Math.max(0, stock);
  const units = before + qty;
  return units > 0 ? (before * cost + total) / units : cost;
}

export * from './kitchen-costs';
export * from './kitchen-dates';
