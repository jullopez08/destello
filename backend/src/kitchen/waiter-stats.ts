import { toIsoDate } from './kitchen-dates';

// Analítica de los meseros (Julieth, 2026-10-20; solo la ve la dueña): cuántas mesas atiende cada uno en un día
// de trabajo, en las últimas 4 semanas. Un día de trabajo es un día en que cobró al menos una mesa.

export const WAITER_STATS_DAYS = 28;

export type ClosedTable = { waiterId: string | null; waiter: string | null; closedAt: Date; subtotal: number; tip: number };

export type WaiterStat = {
  id: string;
  name: string;
  tables: number;
  /** Días en que cobró al menos una mesa */
  days: number;
  /** Mesas por día de trabajo, con un decimal */
  perDay: number;
  /** Lo que consume una mesa en promedio (sin la propina) */
  avgSale: number;
  tips: number;
};

export function waiterStats(rows: ClosedTable[]): WaiterStat[] {
  const by = new Map<string, { name: string; tables: number; dates: Set<string>; sales: number; tips: number }>();
  for (const r of rows) {
    // Una mesa sin mesero (lo quitaron del equipo) no cuenta para nadie.
    if (!r.waiterId || r.subtotal <= 0) continue;
    const w = by.get(r.waiterId) ?? { name: r.waiter ?? 'Mesero', tables: 0, dates: new Set<string>(), sales: 0, tips: 0 };
    w.tables++;
    w.dates.add(toIsoDate(r.closedAt));
    w.sales += r.subtotal;
    w.tips += r.tip;
    by.set(r.waiterId, w);
  }
  return [...by.entries()]
    .map(([id, w]) => ({
      id,
      name: w.name,
      tables: w.tables,
      days: w.dates.size,
      perDay: Math.round((w.tables / w.dates.size) * 10) / 10,
      avgSale: Math.round(w.sales / w.tables),
      tips: w.tips,
    }))
    .sort((a, b) => b.perDay - a.perDay || b.tables - a.tables);
}
