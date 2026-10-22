import { orderDateProblem } from './kitchen-dates';

// 2026-10-22 es jueves; domingo (0) cerrado.
describe('orderDateProblem', () => {
  const today = '2026-10-22';

  it('acepta desde el primer día posible hasta 60 días', () => {
    expect(orderDateProblem('2026-10-22', today, today, [0])).toBeNull();
    expect(orderDateProblem('2026-12-21', today, today, [])).toBeNull();
  });

  it('no deja antes del primer día posible (hora de corte o atrasado)', () => {
    expect(orderDateProblem('2026-10-21', today, today, [])).toBe('Escoge hoy o un día después.');
    expect(orderDateProblem('2026-10-22', '2026-10-23', today, [])).toMatch(/hora de corte/);
  });

  it('no deja días cerrados ni más de 60 días', () => {
    expect(orderDateProblem('2026-10-25', today, today, [0])).toBe('Ese día el negocio está cerrado.');
    expect(orderDateProblem('2026-12-22', today, today, [])).toMatch(/60 días/);
  });
});
