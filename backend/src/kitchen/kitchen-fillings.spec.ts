import { productCost, productionPlan } from './kitchen-rules';
import type { KitchenRuleData } from './kitchen-rules';

// Rellenos: comprado (insumo) o hecho en casa (otra receta, en gramos).
const data: KitchenRuleData = {
  supplies: [
    { id: 'harina', name: 'Harina', kind: 'MASS', stock: 100000, min: 0, cost: 2 },
    { id: 'leche', name: 'Leche', kind: 'VOLUME', stock: 100, min: 0, cost: 4 },
    { id: 'nutella', name: 'Nutella', kind: 'MASS', stock: 100000, min: 0, cost: 40 },
  ],
  recipes: [
    { id: 'choco', name: 'Masa de chocolate', yieldGrams: 1000, items: [{ supplyId: 'harina', qty: 1000 }] },
    { id: 'arequipe', name: 'Arequipe', yieldGrams: 500, items: [{ supplyId: 'leche', qty: 1000 }] },
  ],
  lots: [],
  products: [
    { id: 'rellenaNutella', mode: 'ON_DEMAND', recipeId: 'choco', grams: 120, extras: [{ supplyId: 'nutella', qty: 30 }] },
    { id: 'rellenaArequipe', mode: 'ON_DEMAND', recipeId: 'choco', grams: 120, extras: [{ recipeId: 'arequipe', qty: 25 }] },
  ],
  presentations: [
    { id: 'rellenas', kind: 'UNIT', price: 10500, items: [{ productId: 'rellenaNutella', units: 1 }, { productId: 'rellenaArequipe', units: 1 }], pack: [] },
  ],
};

describe('rellenos', () => {
  it('el relleno hecho se produce como receta y el comprado se descuenta como insumo', () => {
    const plan = productionPlan(
      [
        { orderId: 'o1', presentationId: 'rellenas', qty: 2, productId: 'rellenaArequipe' },
        { orderId: 'o1', presentationId: 'rellenas', qty: 3, productId: 'rellenaNutella' },
      ],
      data,
    );
    expect(plan.dough).toEqual({ choco: 5 * 120, arequipe: 2 * 25 });
    expect(plan.direct).toEqual({ nutella: 3 * 30 });
    // 50 g de arequipe = 0,1 tandas = 100 ml de leche
    expect(plan.supplies.find((s) => s.supplyId === 'leche')?.need).toBeCloseTo(100);
  });

  it('costo: el relleno hecho cuesta lo que cuesta su receta por gramo', () => {
    expect(productCost(data.products[1], data)).toBeCloseTo(120 * 2 + 25 * ((1000 * 4) / 500));
    expect(productCost(data.products[0], data)).toBeCloseTo(120 * 2 + 30 * 40);
  });
});
