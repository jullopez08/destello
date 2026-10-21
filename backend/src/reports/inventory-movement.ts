import type { Workbook } from 'exceljs';
import { toIsoDate } from '../kitchen/kitchen-dates';
import type { PrismaService } from '../prisma/prisma.service';
import type { ReportRange } from './report-range';
import { stockMovement } from './stock-days';
import { addSheet, qtyUnit, type Cell } from './xlsx';

type Supply = { id: string; name: string; kind: 'MASS' | 'VOLUME' | 'UNIT'; stock: number; cost: number };

// Hoja "Movimiento" del Excel de inventario: inicial (lo guardado la noche antes de "Desde"), compras, botado, final
// (la noche de "Hasta", o lo de ahora si "Hasta" es hoy) y lo gastado, en cantidad y en pesos.
export async function addMovementSheet(wb: Workbook, prisma: PrismaService, organizationId: string, business: string, range: ReportRange, supplies: Supply[], wasted: { supplyId: string; qty: number }[]) {
  const today = toIsoDate(new Date());
  const [starts, ends, purchases, first] = await Promise.all([
    prisma.supplyStockDay.findMany({ where: { organizationId, date: { lt: range.from } }, orderBy: { date: 'desc' }, distinct: ['supplyId'] }),
    prisma.supplyStockDay.findMany({ where: { organizationId, date: { lte: range.to } }, orderBy: { date: 'desc' }, distinct: ['supplyId'] }),
    prisma.purchaseLine.groupBy({ by: ['supplyId'], where: { purchase: { organizationId, date: { gte: range.from, lte: range.to } } }, _sum: { qty: true, total: true } }),
    prisma.supplyStockDay.findFirst({ where: { organizationId }, orderBy: { date: 'asc' }, select: { date: true } }),
  ]);
  const startOf = new Map(starts.map((d) => [d.supplyId, d]));
  const endOf = new Map(ends.map((d) => [d.supplyId, d]));
  const bought = new Map(purchases.map((p) => [p.supplyId, p]));

  const rows: Cell[][] = supplies.map((s) => {
    const end = range.to >= today ? { stock: s.stock, cost: s.cost } : endOf.get(s.id) ?? { stock: s.stock, cost: s.cost };
    const m = stockMovement(startOf.get(s.id)?.stock ?? null, bought.get(s.id)?._sum.qty ?? 0, wasted.filter((w) => w.supplyId === s.id).reduce((a, w) => a + w.qty, 0), end.stock);
    const q = (n: number | null) => (n === null ? null : qtyUnit(n, s.kind)[0]);
    return [s.name, qtyUnit(0, s.kind)[1], q(m.start), q(m.purchased), bought.get(s.id)?._sum.total ?? 0, q(m.wasted), q(m.end), q(m.used), m.used === null ? null : Math.round(m.used * end.cost)];
  });

  const since = first ? `Destello guarda el inventario cada noche desde el ${first.date.split('-').reverse().join('/')}.` : 'Destello empieza a guardar el inventario esta noche.';
  addSheet(
    wb,
    'Movimiento',
    { business, range, title: 'Movimiento del inventario', note: `Gastado = inicial + compras − botado − final (incluye producción, comandas y ajustes). ${since}` },
    [
      { header: 'Insumo', width: 26 },
      { header: 'Unidad', width: 8 },
      { header: 'Inicial', kind: 'qty' },
      { header: 'Compras', kind: 'qty' },
      { header: 'Compras ($)', kind: 'money', total: true },
      { header: 'Botado', kind: 'qty' },
      { header: 'Final', kind: 'qty' },
      { header: 'Gastado', kind: 'qty' },
      { header: 'Gastado ($)', kind: 'money', total: true },
    ],
    rows,
  );
}
