// Costos, márgenes y precios de lo que se vende. Copia en
// `backend/src/kitchen/kitchen-costs.ts`: si cambias una, cambia la otra.

import type { KitchenRuleData, OrderLineInput, RulePresentation, RuleProduct, RuleRecipe, RuleSupply } from './rules';

type Shape = Pick<RulePresentation, 'kind' | 'price' | 'items' | 'pack' | 'sizes'>;

const byId = <T extends { id: string }>(list: T[], id: string | null | undefined) => list.find((x) => x.id === id);

export function recipeCostPerGram(recipe: Pick<RuleRecipe, 'items' | 'yieldGrams'>, supplies: RuleSupply[]): number {
  if (!(recipe.yieldGrams > 0)) return 0;
  const total = recipe.items.reduce((sum, item) => sum + item.qty * (byId(supplies, item.supplyId)?.cost ?? 0), 0);
  return total / recipe.yieldGrams;
}

export function productCost(product: Pick<RuleProduct, 'recipeId' | 'grams' | 'extras'>, data: KitchenRuleData): number {
  const recipe = byId(data.recipes, product.recipeId);
  const dough = recipe ? product.grams * recipeCostPerGram(recipe, data.supplies) : 0;
  const extras = product.extras.reduce((sum, e) => {
    const filling = byId(data.recipes, e.recipeId);
    return sum + e.qty * (filling ? recipeCostPerGram(filling, data.supplies) : (byId(data.supplies, e.supplyId)?.cost ?? 0));
  }, 0);
  return dough + extras;
}

const supplyCost = (data: KitchenRuleData, supplyId: string | null | undefined) => byId(data.supplies, supplyId)?.cost ?? 0;

// El tamaño más barato: es el precio "desde" de una presentación por tamaño.
export function cheapestSize<T extends { price: number }>(sizes: T[] | undefined): T | undefined {
  return [...(sizes ?? [])].sort((a, b) => a.price - b.price)[0];
}

// Costo de lo que se vende:
// - Caja armada: todo lo que lleva más su empaque.
// - Por unidad: una unidad del sabor más caro, sola en su empaque de siempre.
// - Sabor y tamaño: el tamaño más barato con el sabor más caro y su empaque.
// Así el margen nunca sale mejor de lo que es.
export function presentationCost(presentation: Shape, data: KitchenRuleData): number {
  const pack = presentation.pack.reduce((sum, p) => sum + p.qty * supplyCost(data, p.supplyId), 0);
  const flavors = presentation.items.map((i) => byId(data.products, i.productId)).filter((p) => !!p);

  if (presentation.kind === 'UNIT') {
    return Math.max(0, ...flavors.map((p) => productCost(p, data))) + pack;
  }
  if (presentation.kind === 'SIZES') {
    const size = cheapestSize(presentation.sizes);
    if (!size) return 0;
    const baked = flavors.map((p) => productCost({ ...p, grams: size.grams || p.grams }, data));
    return Math.max(0, ...baked) + supplyCost(data, size.packSupplyId);
  }
  const items = presentation.items.reduce((sum, item) => {
    const product = byId(data.products, item.productId);
    return sum + (product ? item.units * productCost(product, data) : 0);
  }, 0);
  return items + pack;
}

// Precio de una línea del pedido: en sabor y tamaño es el del tamaño más el
// recargo del sabor; en las demás, el precio de la presentación.
export function linePrice(presentation: Omit<Shape, 'pack'>, line: Pick<OrderLineInput, 'productId' | 'sizeId'>): number {
  if (presentation.kind !== 'SIZES') return presentation.price;
  const size = byId(presentation.sizes ?? [], line.sizeId);
  const flavor = presentation.items.find((i) => i.productId === line.productId);
  return (size?.price ?? presentation.price) + (flavor?.surcharge ?? 0);
}

export function presentationMargin(presentation: Shape, data: KitchenRuleData): number {
  return presentation.price ? (presentation.price - presentationCost(presentation, data)) / presentation.price : 0;
}

export type Health = { kind: 'ok' | 'warn' | 'bad'; label: string; suggested: number | null };

// Precio sugerido: el que da el margen que busca la dueña, redondeado hacia
// arriba a los $500.
export function presentationHealth(
  presentation: Shape,
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
