// Reglas de la cocina, sin acceso a la base de datos. Las usan los servicios
// del backend para validar y descontar inventario, y el frontend las repite en
// `frontend/lib/kitchen/rules.ts` para mostrar lo mismo antes de guardar.
// Si cambias algo aquí, cámbialo allá también.
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
  extras: { supplyId: string; qty: number }[];
}

export interface RulePresentation {
  id: string;
  price: number;
  items: { productId: string; units: number }[];
  pack: { supplyId: string; qty: number }[];
}

export interface KitchenRuleData {
  supplies: RuleSupply[];
  recipes: RuleRecipe[];
  lots: RuleLot[];
  products: RuleProduct[];
  presentations: RulePresentation[];
}

export interface OrderLineInput {
  presentationId: string;
  qty: number;
}

const byId = <T extends { id: string }>(list: T[], id: string) => list.find((x) => x.id === id);

export function recipeCostPerGram(recipe: Pick<RuleRecipe, 'items' | 'yieldGrams'>, supplies: RuleSupply[]): number {
  if (!(recipe.yieldGrams > 0)) return 0;
  const total = recipe.items.reduce((sum, item) => sum + item.qty * (byId(supplies, item.supplyId)?.cost ?? 0), 0);
  return total / recipe.yieldGrams;
}

export function productCost(product: Pick<RuleProduct, 'recipeId' | 'grams' | 'extras'>, data: KitchenRuleData): number {
  const recipe = byId(data.recipes, product.recipeId);
  const dough = recipe ? product.grams * recipeCostPerGram(recipe, data.supplies) : 0;
  const extras = product.extras.reduce((sum, e) => sum + e.qty * (byId(data.supplies, e.supplyId)?.cost ?? 0), 0);
  return dough + extras;
}

export function presentationCost(presentation: Pick<RulePresentation, 'items' | 'pack'>, data: KitchenRuleData): number {
  const items = presentation.items.reduce((sum, item) => {
    const product = byId(data.products, item.productId);
    return sum + (product ? item.units * productCost(product, data) : 0);
  }, 0);
  const pack = presentation.pack.reduce((sum, p) => sum + p.qty * (byId(data.supplies, p.supplyId)?.cost ?? 0), 0);
  return items + pack;
}

export function presentationMargin(presentation: Pick<RulePresentation, 'price' | 'items' | 'pack'>, data: KitchenRuleData): number {
  return presentation.price ? (presentation.price - presentationCost(presentation, data)) / presentation.price : 0;
}

export type Health = { kind: 'ok' | 'warn' | 'bad'; label: string; suggested: number | null };

// Precio sugerido: el que da el margen que busca la dueña, redondeado hacia
// arriba a los $500.
export function presentationHealth(
  presentation: Pick<RulePresentation, 'price' | 'items' | 'pack'>,
  data: KitchenRuleData,
  targetMarginPercent: number,
): Health {
  const cost = presentationCost(presentation, data);
  const margin = presentationMargin(presentation, data);
  const target = targetMarginPercent / 100;
  const suggested = Math.ceil(cost / (1 - target) / 500) * 500;
  if (presentation.price < cost) return { kind: 'bad', label: 'Pierde dinero', suggested };
  if (margin < target) return { kind: 'warn', label: 'Margen bajo', suggested };
  return { kind: 'ok', label: 'Margen sano', suggested: null };
}

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
  /** cajas por presentación */
  boxes: Record<string, number>;
}

export function requirements(lines: OrderLineInput[], data: KitchenRuleData): Requirements {
  const dough: Record<string, number> = {};
  const direct: Record<string, number> = {};
  const units: Record<string, number> = {};
  const boxes: Record<string, number> = {};

  for (const line of lines) {
    const presentation = byId(data.presentations, line.presentationId);
    if (!presentation) continue;
    boxes[presentation.id] = (boxes[presentation.id] ?? 0) + line.qty;
    for (const p of presentation.pack) direct[p.supplyId] = (direct[p.supplyId] ?? 0) + p.qty * line.qty;
    for (const item of presentation.items) {
      const product = byId(data.products, item.productId);
      if (!product) continue;
      const count = item.units * line.qty;
      units[product.id] = (units[product.id] ?? 0) + count;
      dough[product.recipeId] = (dough[product.recipeId] ?? 0) + count * product.grams;
      for (const e of product.extras) direct[e.supplyId] = (direct[e.supplyId] ?? 0) + e.qty * count;
    }
  }

  return { dough, direct, units, boxes };
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

// ── Fechas ──

const pad = (n: number) => String(n).padStart(2, '0');

export function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00`);
  d.setDate(d.getDate() + days);
  return toIsoDate(d);
}

export function weekdayOf(isoDate: string): number {
  return new Date(`${isoDate}T12:00:00`).getDay();
}

// Día en que se produce un pedido tomado en `now`: después de la hora de corte
// pasa al día siguiente, y se salta los días sin producción.
export function productionDateFor(now: Date, cutoff: string, closedDays: number[]): string {
  const [h, m] = cutoff.split(':').map(Number);
  let day = toIsoDate(now);
  if (now.getHours() * 60 + now.getMinutes() >= h * 60 + m) day = addDays(day, 1);
  for (let i = 0; i < 7 && closedDays.includes(weekdayOf(day)); i++) day = addDays(day, 1);
  return day;
}
