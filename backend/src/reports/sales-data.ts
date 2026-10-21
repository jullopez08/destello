import { TAX_RATE } from '../kitchen/kitchen-costs';
import { toIsoDate } from '../kitchen/kitchen-dates';
import type { PrismaService } from '../prisma/prisma.service';
import { lineName, withNames } from '../restaurant/kitchen-screen.service';
import type { ReportRange } from './report-range';

export type PayKey = 'CASH' | 'TRANSFER' | 'CARD';
export interface Sale {
  date: string;
  /** Hora del cobro (mesas); los pedidos no la tienen */
  at: Date | null;
  what: string;
  who: string;
  /** Lo vendido, con el impuesto incluido, sin propina ni domicilio */
  amount: number;
  tip: number;
  /** El domicilio del pedido (lo cobra el repartidor): aparte de las ventas */
  fee: number;
  pay: Record<PayKey, number>;
  lines: { name: string; qty: number; total: number }[];
}

const noPay = (): Record<PayKey, number> => ({ CASH: 0, TRANSFER: 0, CARD: 0 });
const sum = (lines: { qty: number; unitPrice: number }[]) => lines.reduce((a, l) => a + l.qty * l.unitPrice, 0);

// Ventas de un rango para los Excel de caja y del contador, con la misma regla que Analítica: pedidos no cancelados
// (por su día de entrega) y mesas cobradas (por el día del cobro, sin las comandas anuladas).
export async function salesData(prisma: PrismaService, organizationId: string, range: ReportRange) {
  const [org, orders, tables, cancelled] = await Promise.all([
    prisma.organization.findUniqueOrThrow({ where: { id: organizationId }, select: { name: true, salesTax: true } }),
    prisma.order.findMany({
      where: { organizationId, status: { not: 'CANCELLED' }, productionDate: { gte: range.from, lte: range.to } },
      orderBy: [{ productionDate: 'asc' }, { number: 'asc' }],
      include: { courier: { select: { name: true } }, lines: { include: withNames } },
    }),
    prisma.tableSession.findMany({
      where: { organizationId, status: 'CLOSED', closedAt: { gte: range.start, lt: range.end } },
      orderBy: { closedAt: 'asc' },
      include: {
        table: { select: { name: true } },
        waiter: { select: { name: true } },
        payments: true,
        tickets: { where: { status: { not: 'CANCELLED' } }, include: { lines: { include: withNames } } },
      },
    }),
    prisma.kitchenTicket.findMany({
      where: { organizationId, status: 'CANCELLED', cancelledAt: { gte: range.start, lt: range.end } },
      orderBy: { cancelledAt: 'asc' },
      include: { lines: { include: withNames }, session: { include: { table: { select: { name: true } } } } },
    }),
  ]);

  const sales: Sale[] = [
    ...orders.map((o) => {
      const amount = sum(o.lines);
      const pay = noPay();
      pay[o.payment] = amount;
      return {
        date: o.productionDate,
        at: null,
        what: `Pedido ${o.number} · ${o.delivery === 'PICKUP' ? 'recoge' : 'domicilio'}`,
        who: o.courier?.name ?? '',
        amount,
        tip: 0,
        fee: o.fee,
        pay,
        lines: o.lines.map((l) => ({ name: lineName(l), qty: l.qty, total: l.qty * l.unitPrice })),
      };
    }),
    ...tables.map((s) => {
      const pay = noPay();
      for (const p of s.payments) pay[p.method] += p.amount;
      const lines = s.tickets.flatMap((k) => k.lines);
      return {
        date: toIsoDate(s.closedAt!),
        at: s.closedAt,
        what: s.table.name,
        who: s.waiter?.name ?? 'La dueña',
        amount: s.subtotal ?? sum(lines),
        tip: s.tip,
        fee: 0,
        pay,
        lines: lines.map((l) => ({ name: lineName(l), qty: l.qty, total: l.qty * l.unitPrice })),
      };
    }),
  ]
    // Una mesa liberada sin consumo no es un cobro.
    .filter((s) => s.amount > 0 || s.tip > 0 || s.fee > 0)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.at?.getTime() ?? 0) - (b.at?.getTime() ?? 0));

  return {
    business: org.name,
    salesTax: org.salesTax,
    taxRate: TAX_RATE[org.salesTax],
    sales,
    cancelled: cancelled.map((k) => ({
      at: k.cancelledAt!,
      table: k.session.table.name,
      number: k.number,
      products: k.lines.map((l) => `${l.qty} × ${lineName(l)}`).join(', '),
      total: sum(k.lines),
      by: k.cancelledBy ?? '',
      reason: k.cancelReason,
      reviewed: !!k.cancelReviewedAt,
    })),
  };
}

/** Días del rango, para que los días sin ventas también salgan (con ceros). */
export function daysOf(range: ReportRange): string[] {
  const days: string[] = [];
  for (const d = new Date(range.start); d < range.end; d.setDate(d.getDate() + 1)) days.push(toIsoDate(d));
  return days;
}
