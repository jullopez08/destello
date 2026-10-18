import { setupMissing } from './kitchen-setup';

describe('setupMissing', () => {
  const ready = { whatsapp: '300 123 4567', recipes: 1, brebKeys: 1, couriers: 1 };

  it('no pide nada cuando están los cuatro pasos', () => {
    expect(setupMissing(ready)).toEqual([]);
  });

  it('pide todo, en orden, a un negocio recién creado', () => {
    expect(setupMissing({ whatsapp: null, recipes: 0, brebKeys: 0, couriers: 0 })).toEqual([
      'el WhatsApp del negocio',
      'una receta',
      'una llave Bre-B',
      'un repartidor',
    ]);
  });

  it('un WhatsApp con solo espacios no cuenta', () => {
    expect(setupMissing({ ...ready, whatsapp: '   ' })).toEqual(['el WhatsApp del negocio']);
  });

  it('una cuenta bancaria sin llave Bre-B no basta', () => {
    expect(setupMissing({ ...ready, brebKeys: 0 })).toEqual(['una llave Bre-B']);
  });
});
