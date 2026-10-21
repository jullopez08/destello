import { stockMovement } from './stock-days';

describe('inventario de un periodo', () => {
  it('gastado = inicial + compras − botado − final', () => {
    expect(stockMovement(5000, 25000, 1000, 9000).used).toBe(20000);
  });

  it('sin inventario inicial guardado no inventa lo gastado', () => {
    expect(stockMovement(null, 25000, 0, 9000).used).toBeNull();
  });

  it('nunca da gastado negativo (un ajuste a mano que subió el inventario)', () => {
    expect(stockMovement(1000, 0, 0, 3000).used).toBe(0);
  });
});
