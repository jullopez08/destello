import { daysBetween, lotGrams, usableLots } from './kitchen-rules';

describe('masa vencida', () => {
  const lots = [
    { id: 'vieja', recipeId: 'choco', left: 800, expiresOn: '2026-10-17' },
    { id: 'nueva', recipeId: 'choco', left: 1200, expiresOn: '2026-10-21' },
  ];

  it('la que vence hoy ya no se usa: hecha el lunes con 4 días, se usa hasta el jueves', () => {
    expect(usableLots(lots, '2026-10-16').map((l) => l.id)).toEqual(['vieja', 'nueva']);
    expect(usableLots(lots, '2026-10-17').map((l) => l.id)).toEqual(['nueva']);
  });

  it('el plan de producción no cuenta la masa vencida', () => {
    expect(lotGrams(usableLots(lots, '2026-10-17'), 'choco')).toBe(1200);
  });

  it('cuenta los días que faltan', () => {
    expect(daysBetween('2026-10-17', '2026-10-19')).toBe(2);
    expect(daysBetween('2026-10-17', '2026-10-17')).toBe(0);
    expect(daysBetween('2026-10-17', '2026-10-15')).toBe(-2);
    expect(daysBetween('2026-10-30', '2026-11-02')).toBe(3);
  });
});
