import { batchExpired, perishableByDefault, takeFromBatches, trimBatches, usableStock } from './supply-batches';

describe('vencimiento de insumos', () => {
  // Mantequilla: 3.000 g en total; 1.000 g vencieron el 15, 1.500 g vencen el 20 y 500 g no tienen fecha.
  const batches = [
    { id: 'vieja', left: 1000, expiresOn: '2026-10-15' },
    { id: 'nueva', left: 1500, expiresOn: '2026-10-20' },
  ];

  it('un lote se usa hasta el día de su fecha', () => {
    expect(batchExpired({ expiresOn: '2026-10-20' }, '2026-10-20')).toBe(false);
    expect(batchExpired({ expiresOn: '2026-10-20' }, '2026-10-21')).toBe(true);
  });

  it('lo vencido no cuenta como disponible', () => {
    expect(usableStock(3000, batches, '2026-10-17')).toBe(2000);
    expect(usableStock(3000, batches, '2026-10-21')).toBe(500);
  });

  it('gasta primero el lote que vence antes y nunca el vencido', () => {
    expect(takeFromBatches(batches, 1200, '2026-10-17')).toEqual([{ id: 'nueva', used: 1200 }]);
    // Lo que pasa de los lotes sale de lo que no tiene fecha
    expect(takeFromBatches(batches, 1800, '2026-10-17')).toEqual([{ id: 'nueva', used: 1500 }]);
  });

  it('usa los lotes en orden de vencimiento', () => {
    const two = [
      { id: 'b', left: 300, expiresOn: '2026-10-25' },
      { id: 'a', left: 200, expiresOn: '2026-10-19' },
    ];
    expect(takeFromBatches(two, 400, '2026-10-17')).toEqual([
      { id: 'a', used: 200 },
      { id: 'b', used: 200 },
    ]);
  });

  it('si la existencia se corrige por debajo de los lotes, bajan los que vencen antes', () => {
    expect(trimBatches(batches, 3000)).toEqual([]);
    expect(trimBatches(batches, 2000)).toEqual([{ id: 'vieja', used: 500 }]);
  });
});

describe('qué insumos llevan fecha de vencimiento', () => {
  it('casi todo ingrediente vence', () => {
    for (const name of ['Leche entera', 'Queso crema', 'Huevos', 'Cacao en polvo', 'Harina de trigo', 'Levadura seca', 'Mantequilla sin sal']) {
      expect(perishableByDefault(name, 'INGREDIENT')).toBe(true);
    }
  });

  it('la sal, el azúcar y similares no; los empaques tampoco', () => {
    for (const name of ['Azúcar blanca', 'Azúcar morena', 'Sal marina', 'Bicarbonato de sodio', 'Miel de abejas']) {
      expect(perishableByDefault(name, 'INGREDIENT')).toBe(false);
    }
    expect(perishableByDefault('Caja kraft x9', 'PACKAGING')).toBe(false);
    // Guardado por error como ingrediente: por el nombre se sabe que es un empaque
    expect(perishableByDefault('Bolsas papel', 'INGREDIENT')).toBe(false);
  });
});
