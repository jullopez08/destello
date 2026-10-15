import { KitchenRuleData, linePrice, presentationCost, productionPlan, requirements } from './kitchen-rules';

// Las tres formas de vender: caja armada, por unidad y sabor y tamaño.
const data: KitchenRuleData = {
  supplies: [
    { id: 'harina', name: 'Harina', kind: 'MASS', stock: 100000, min: 0, cost: 2 },
    { id: 'queso', name: 'Queso crema', kind: 'MASS', stock: 100000, min: 0, cost: 30 },
    { id: 'cajaPeq', name: 'Caja pequeña', kind: 'UNIT', stock: 10, min: 0, cost: 1000 },
    { id: 'bolsa', name: 'Bolsa de papel', kind: 'UNIT', stock: 10, min: 0, cost: 300 },
    { id: 'cajaTorta', name: 'Caja de torta', kind: 'UNIT', stock: 10, min: 0, cost: 4000 },
  ],
  recipes: [
    { id: 'masa', name: 'Masa de galleta', yieldGrams: 1000, items: [{ supplyId: 'harina', qty: 1000 }] },
    { id: 'cheese', name: 'Mezcla de cheesecake', yieldGrams: 1000, items: [{ supplyId: 'queso', qty: 1000 }] },
  ],
  lots: [],
  products: [
    { id: 'pequena', mode: 'LOT', recipeId: 'masa', grams: 20, extras: [] },
    { id: 'rellenaChips', mode: 'LOT', recipeId: 'masa', grams: 120, extras: [] },
    { id: 'rellenaMaca', mode: 'LOT', recipeId: 'masa', grams: 150, extras: [] },
    { id: 'vasco', mode: 'ON_DEMAND', recipeId: 'cheese', grams: 400, extras: [] },
    { id: 'pistacho', mode: 'ON_DEMAND', recipeId: 'cheese', grams: 400, extras: [] },
  ],
  presentations: [
    { id: 'caja9', kind: 'BOX', price: 16000, items: [{ productId: 'pequena', units: 9 }], pack: [{ supplyId: 'cajaPeq', qty: 1 }] },
    {
      id: 'rellena',
      kind: 'UNIT',
      price: 10500,
      items: [{ productId: 'rellenaChips', units: 1 }, { productId: 'rellenaMaca', units: 1 }],
      pack: [{ supplyId: 'bolsa', qty: 1 }],
    },
    {
      id: 'cheesecake',
      kind: 'SIZES',
      price: 32000,
      items: [{ productId: 'vasco', units: 1, surcharge: 0 }, { productId: 'pistacho', units: 1, surcharge: 2500 }],
      pack: [],
      sizes: [
        { id: 'mediano', price: 76000, grams: 1200, packSupplyId: 'cajaTorta' },
        { id: 'pequeno', price: 32000, grams: 0, packSupplyId: null },
      ],
    },
  ],
};

describe('formas de vender', () => {
  it('por unidad: cada sabor va a producción y el empaque de siempre sale una vez por pedido', () => {
    const req = requirements(
      [
        { orderId: 'o1', presentationId: 'rellena', qty: 3, productId: 'rellenaChips' },
        { orderId: 'o1', presentationId: 'rellena', qty: 1, productId: 'rellenaMaca' },
        { orderId: 'o2', presentationId: 'rellena', qty: 2, productId: 'rellenaChips' },
      ],
      data,
    );
    expect(req.units).toEqual({ rellenaChips: 5, rellenaMaca: 1 });
    expect(req.dough.masa).toBe(5 * 120 + 150);
    expect(req.direct.bolsa).toBe(2);
    expect(req.boxes.rellena).toBe(2);
  });

  it('por unidad: si el pedido cambia el empaque, se descuenta ese y no el de siempre', () => {
    const req = requirements([{ orderId: 'o1', presentationId: 'rellena', qty: 12, productId: 'rellenaChips', packSupplyId: 'cajaPeq' }], data);
    expect(req.direct).toEqual({ cajaPeq: 1 });
  });

  it('sabor y tamaño: usa los gramos del molde (o los del producto) y el empaque del tamaño', () => {
    const req = requirements(
      [
        { presentationId: 'cheesecake', qty: 2, productId: 'pistacho', sizeId: 'mediano' },
        { presentationId: 'cheesecake', qty: 1, productId: 'vasco', sizeId: 'pequeno' },
      ],
      data,
    );
    expect(req.units).toEqual({ pistacho: 2, vasco: 1 });
    expect(req.dough.cheese).toBe(2 * 1200 + 400);
    expect(req.direct).toEqual({ cajaTorta: 2 });
    expect(req.unitGrams).toEqual({ pistacho: 2400, vasco: 400 });
  });

  it('caja armada sigue igual', () => {
    const plan = productionPlan([{ presentationId: 'caja9', qty: 2 }], data);
    expect(plan.units).toEqual({ pequena: 18 });
    expect(plan.direct).toEqual({ cajaPeq: 2 });
  });

  it('precio de la línea: tamaño más el recargo del sabor', () => {
    const cheesecake = data.presentations[2];
    expect(linePrice(cheesecake, { productId: 'pistacho', sizeId: 'mediano' })).toBe(78500);
    expect(linePrice(cheesecake, { productId: 'vasco', sizeId: 'pequeno' })).toBe(32000);
    expect(linePrice(data.presentations[1], { productId: 'rellenaMaca' })).toBe(10500);
  });

  it('costo: por unidad toma el sabor más caro con su empaque; por tamaño, el tamaño más barato', () => {
    expect(presentationCost(data.presentations[1], data)).toBeCloseTo(150 * 2 + 300);
    expect(presentationCost(data.presentations[2], data)).toBeCloseTo(400 * 30);
  });
});
