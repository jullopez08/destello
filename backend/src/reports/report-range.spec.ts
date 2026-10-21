import { reportRange } from './report-range';

describe('rango de un Excel', () => {
  it('cubre desde las 00:00 del primer día hasta antes del día siguiente al último', () => {
    const r = reportRange('2026-10-01', '2026-10-31');
    expect(r.start.getDate()).toBe(1);
    expect(r.end.getMonth()).toBe(10);
    expect(r.end.getDate()).toBe(1);
  });

  it('acepta un solo día', () => {
    expect(() => reportRange('2026-10-21', '2026-10-21')).not.toThrow();
  });

  it('rechaza fechas que faltan, mal escritas, al revés o de más de un año', () => {
    expect(() => reportRange(undefined, '2026-10-21')).toThrow(/Elige/);
    expect(() => reportRange('21/10/2026', '2026-10-21')).toThrow(/Elige/);
    expect(() => reportRange('2026-10-21', '2026-10-01')).toThrow(/antes/);
    expect(() => reportRange('2025-01-01', '2026-10-21')).toThrow(/un año/);
  });
});
