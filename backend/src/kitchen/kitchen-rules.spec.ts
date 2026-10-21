import {
  addDays,
  averageCostAfterPurchase,
  consumedAmount,
  KitchenRuleData,
  netPrice,
  presentationCost,
  presentationHealth,
  presentationMargin,
  taxIn,
  productionDateFor,
  productionPlan,
  recipeCostPerGram,
} from './kitchen-rules';

// Datos de la cocina de ejemplo del diseño (galletas por lote y rollos sobre pedido).
const data: KitchenRuleData = {
  supplies: [
    { id: 'harina', name: 'Harina', kind: 'MASS', stock: 12000, min: 5000, cost: 3.2 },
    { id: 'mantequilla', name: 'Mantequilla', kind: 'MASS', stock: 3400, min: 3000, cost: 28 },
    { id: 'huevos', name: 'Huevos', kind: 'UNIT', stock: 2, min: 30, cost: 600 },
    { id: 'caja9', name: 'Caja x9', kind: 'UNIT', stock: 40, min: 20, cost: 900 },
    { id: 'capacillo', name: 'Capacillo', kind: 'UNIT', stock: 500, min: 200, cost: 12 },
  ],
  recipes: [
    { id: 'chips', name: 'Masa con chips', yieldGrams: 2000, items: [{ supplyId: 'harina', qty: 1000 }, { supplyId: 'mantequilla', qty: 500 }, { supplyId: 'huevos', qty: 4 }] },
    { id: 'rollos', name: 'Masa de rollos', yieldGrams: 1800, items: [{ supplyId: 'harina', qty: 1000 }, { supplyId: 'huevos', qty: 3 }] },
  ],
  lots: [
    { id: 'l1', recipeId: 'chips', left: 100, expiresOn: '2026-10-14' },
    { id: 'l2', recipeId: 'rollos', left: 500, expiresOn: '2026-10-14' },
  ],
  products: [
    { id: 'galleta', mode: 'LOT', recipeId: 'chips', grams: 20, extras: [{ supplyId: 'capacillo', qty: 1 }] },
    { id: 'rollo', mode: 'ON_DEMAND', recipeId: 'rollos', grams: 120, extras: [] },
  ],
  presentations: [
    { id: 'x9', price: 20000, items: [{ productId: 'galleta', units: 9 }], pack: [{ supplyId: 'caja9', qty: 1 }] },
    { id: 'x3', price: 900, items: [{ productId: 'rollo', units: 3 }], pack: [] },
  ],
};

describe('kitchen rules — costos', () => {
  it('costo por gramo de una masa', () => {
    // (1000·3,2 + 500·28 + 4·600) / 2000 = 9,8
    expect(recipeCostPerGram(data.recipes[0], data.supplies)).toBeCloseTo(9.8);
  });

  it('costo de una caja: masa + extras por unidad + empaque', () => {
    // 9 × (20 g × 9,8 + 1 capacillo × 12) + 1 caja × 900 = 9 × 208 + 900
    expect(presentationCost(data.presentations[0], data)).toBeCloseTo(9 * 208 + 900);
  });

  it('marca la caja que pierde dinero y sugiere un precio redondeado a $500', () => {
    const health = presentationHealth(data.presentations[1], data, 50);
    expect(health.kind).toBe('bad');
    expect(health.suggested! % 500).toBe(0);
    expect(health.suggested!).toBeGreaterThanOrEqual(presentationCost(data.presentations[1], data) * 2);
  });

  it('una caja con buen margen no trae precio sugerido', () => {
    expect(presentationHealth(data.presentations[0], data, 50)).toEqual({ kind: 'ok', label: 'Margen sano', suggested: null });
  });

  it('el impuesto al consumo va incluido en el precio: de $28.000, $2.074 son impuesto', () => {
    expect(taxIn(28000, 0.08)).toBe(2074);
    expect(Math.round(netPrice(28000, 0.08))).toBe(25926);
    expect(taxIn(28000, 0)).toBe(0);
  });

  it('con impuesto, el margen se calcula sobre lo que le queda al negocio y el sugerido lo suma', () => {
    const box = data.presentations[0];
    const taxed = { ...data, taxRate: 0.08 };
    const cost = presentationCost(box, data);
    expect(presentationMargin(box, taxed)).toBeCloseTo((box.price / 1.08 - cost) / (box.price / 1.08));
    expect(presentationMargin(box, taxed)).toBeLessThan(presentationMargin(box, data));
    const plain = presentationHealth(data.presentations[1], data, 50).suggested!;
    const withTax = presentationHealth(data.presentations[1], taxed, 50).suggested!;
    expect(withTax).toBeGreaterThan(plain);
    expect(withTax).toBeGreaterThanOrEqual(presentationCost(data.presentations[1], data) * 2 * 1.08);
  });
});

describe('kitchen rules — plan de producción', () => {
  it('usa primero la masa del lote y hace solo lo que falta', () => {
    const plan = productionPlan([{ presentationId: 'x9', qty: 1 }], data);
    const row = plan.doughRows.find((d) => d.recipeId === 'chips')!;
    expect(row.need).toBe(180);
    expect(row.fromLots).toBe(100);
    expect(row.toMake).toBe(80);
    expect(plan.boxes).toEqual({ x9: 1 });
    expect(plan.units).toEqual({ galleta: 9 });
  });

  it('los productos sobre pedido nunca toman masa de lotes', () => {
    const plan = productionPlan([{ presentationId: 'x3', qty: 1 }], data);
    const row = plan.doughRows.find((d) => d.recipeId === 'rollos')!;
    expect(row.fromLots).toBe(0);
    expect(row.toMake).toBe(360);
  });

  it('avisa qué insumo no alcanza', () => {
    const plan = productionPlan([{ presentationId: 'x3', qty: 5 }], data);
    // 5 cajas × 3 rollos × 120 g = 1800 g = 1 tanda → 3 huevos, solo hay 2
    expect(plan.shortages.map((s) => s.supplyId)).toEqual(['huevos']);
    expect(plan.shortages[0].short).toBeCloseTo(1);
  });
});

describe('kitchen rules — inventario', () => {
  it('lo que se cuenta por unidad se descuenta redondeado hacia arriba', () => {
    expect(consumedAmount('UNIT', 1.2)).toBe(2);
    expect(consumedAmount('UNIT', 3)).toBe(3);
    expect(consumedAmount('MASS', 1.2)).toBe(1.2);
  });

  it('el costo promedio pondera lo que había con lo que se compró', () => {
    // 1000 g a $3 + 1000 g por $5000 → $4 por g
    expect(averageCostAfterPurchase(1000, 3, 1000, 5000)).toBeCloseTo(4);
    // sin existencia, el costo es el de la compra
    expect(averageCostAfterPurchase(0, 3, 500, 2000)).toBeCloseTo(4);
  });

  it('lo que queda (aunque no sean kilos cerrados) conserva su valor al comprar más barato', () => {
    // Ejemplo de Julieth: quedan 4,65 kg comprados a $2.500/kg y llegan 36 kg por $82.800 ($2.300/kg).
    const cost = averageCostAfterPurchase(4650, 2.5, 36000, 82800);
    expect(cost * 1000).toBeCloseTo(2322.88, 1); // nuevo promedio por kilo
    // Nada se pierde: lo que vale el total es lo que valían los 4,65 kg más lo que se pagó.
    expect(cost * (4650 + 36000)).toBeCloseTo(4650 * 2.5 + 82800, 6);
  });
});

describe('kitchen rules — día de producción', () => {
  it('antes de la hora de corte se produce hoy', () => {
    expect(productionDateFor(new Date('2026-10-13T09:00:00'), '12:00', [0])).toBe('2026-10-13');
  });

  it('después de la hora de corte pasa al día siguiente', () => {
    expect(productionDateFor(new Date('2026-10-13T12:00:00'), '12:00', [0])).toBe('2026-10-14');
  });

  it('se salta los días en que el negocio está cerrado', () => {
    // sábado 17 después del corte → domingo cerrado → lunes 19
    expect(productionDateFor(new Date('2026-10-17T15:00:00'), '12:00', [0])).toBe('2026-10-19');
  });

  it('addDays cruza el mes', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
  });
});
