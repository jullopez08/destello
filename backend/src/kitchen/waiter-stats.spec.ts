import { waiterStats, type ClosedTable } from './waiter-stats';

const at = (day: string, hour = 13) => new Date(`${day}T${String(hour).padStart(2, '0')}:00:00`);
const row = (waiterId: string | null, day: string, subtotal = 40000, tip = 0): ClosedTable => ({ waiterId, waiter: waiterId === 'a' ? 'Ana' : 'Beto', closedAt: at(day), subtotal, tip });

describe('analítica de los meseros', () => {
  it('cuenta mesas por día de trabajo, no por día del calendario', () => {
    // Ana: 5 mesas en 2 días (el miércoles no trabajó) → 2,5 al día.
    const [ana] = waiterStats([row('a', '2026-10-19'), row('a', '2026-10-19'), row('a', '2026-10-19'), row('a', '2026-10-21'), row('a', '2026-10-21')]);
    expect(ana).toMatchObject({ name: 'Ana', tables: 5, days: 2, perDay: 2.5 });
  });

  it('da la venta promedio por mesa sin la propina y suma las propinas', () => {
    const [ana] = waiterStats([row('a', '2026-10-19', 30000, 3000), row('a', '2026-10-19', 50000, 0)]);
    expect(ana.avgSale).toBe(40000);
    expect(ana.tips).toBe(3000);
  });

  it('pone primero a quien más mesas atiende al día', () => {
    const list = waiterStats([row('a', '2026-10-19'), row('b', '2026-10-19'), row('b', '2026-10-19')]);
    expect(list.map((w) => w.name)).toEqual(['Beto', 'Ana']);
  });

  it('no cuenta mesas liberadas sin consumo ni mesas sin mesero', () => {
    expect(waiterStats([row('a', '2026-10-19', 0), row(null, '2026-10-19')])).toEqual([]);
  });
});
