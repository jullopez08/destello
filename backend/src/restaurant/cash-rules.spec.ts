import { closeOutcome, expectedCash } from './cash-rules';

describe('arqueo del cajón', () => {
  it('cuadra si la diferencia es menor de $500 (monedas)', () => {
    expect(closeOutcome(100000, 100000, null)).toEqual({ kind: 'close' });
    expect(closeOutcome(99600, 100000, null)).toEqual({ kind: 'close' });
  });

  it('el primer conteo que no cuadra pide contar de nuevo, sin decir cuánto', () => {
    expect(closeOutcome(92000, 100000, null)).toEqual({ kind: 'recount' });
  });

  it('el segundo conteo que no cuadra muestra la diferencia y pide qué pasó', () => {
    expect(closeOutcome(92000, 100000, 92000)).toEqual({ kind: 'explain', difference: -8000 });
    expect(closeOutcome(102000, 100000, 92000, '  ')).toEqual({ kind: 'explain', difference: 2000 });
  });

  it('con la explicación se cierra aunque no cuadre', () => {
    expect(closeOutcome(92000, 100000, 92000, 'Di mal un vuelto')).toEqual({ kind: 'close' });
  });

  it('lo esperado es la base + efectivo cobrado + entradas − salidas', () => {
    expect(expectedCash({ openingCash: 50000, tables: 80000, pickups: 20000, moves: [{ kind: 'IN', amount: 30000 }, { kind: 'OUT', amount: 15000 }] })).toBe(165000);
  });
});
