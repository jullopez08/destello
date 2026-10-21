import type { PrismaService } from '../prisma/prisma.service';
import { CANCEL_REASON_TEXT, type CancelReason } from '../restaurant/cancel-reasons';
import { taxIn } from '../kitchen/kitchen-costs';
import { toIsoDate } from '../kitchen/kitchen-dates';
import { CashDrawerService } from '../restaurant/cash-drawer.service';
import type { ReportRange } from './report-range';
import { daysOf, salesData } from './sales-data';
import { addSheet, dmy, hm, toBuffer, workbook, type Column } from './xlsx';

// Cierre de caja (Julieth, 2026-10-21; como los informes de caja de Toast o Square): lo cobrado cada día por forma de
// pago, la propina aparte (es del personal), las anulaciones, cada cobro con quién lo atendió y las propinas por mesero.
// Destello no lleva el conteo del efectivo del cajón: el Excel dice cuánto debería haber para compararlo.
export async function cashReport(prisma: PrismaService, organizationId: string, range: ReportRange) {
  const { business, taxRate, sales, cancelled } = await salesData(prisma, organizationId, range);
  const wb = workbook();
  const info = { business, range };

  const daily = daysOf(range).map((date) => {
    const day = sales.filter((s) => s.date === date);
    const lost = cancelled.filter((k) => toIsoDate(k.at) === date);
    const add = (f: (s: (typeof sales)[number]) => number) => day.reduce((a, s) => a + f(s), 0);
    const cash = add((s) => s.pay.CASH);
    const transfer = add((s) => s.pay.TRANSFER);
    const card = add((s) => s.pay.CARD);
    const tips = add((s) => s.tip);
    return [dmy(date), cash, transfer, card, cash + transfer + card, tips, cash + transfer + card - tips, add((s) => s.fee), lost.length, lost.reduce((a, k) => a + k.total, 0)];
  });
  const dayCols: Column[] = [
    { header: 'Fecha', width: 12 },
    { header: 'Efectivo', kind: 'money', total: true },
    { header: 'Transferencia / Bre-B', kind: 'money', total: true },
    { header: 'Tarjeta (datáfono)', kind: 'money', total: true },
    { header: 'Total cobrado', kind: 'money', total: true },
    { header: 'De eso, propinas', kind: 'money', total: true },
    { header: 'Ventas sin propina', kind: 'money', total: true },
    { header: 'Domicilios (repartidor)', kind: 'money', total: true },
    { header: 'Comandas anuladas', kind: 'int', total: true },
    { header: 'Valor anulado', kind: 'money', total: true },
  ];
  addSheet(wb, 'Por día', { ...info, title: 'Cierre de caja', note: 'Pedidos por su día de entrega y mesas por el día del cobro. El domicilio no suma: es del repartidor.' }, dayCols, daily);

  addSheet(
    wb,
    'Cobros',
    { ...info, title: 'Cada cobro' },
    [
      { header: 'Fecha', width: 12 },
      { header: 'Hora', width: 11 },
      { header: 'Qué', width: 26 },
      { header: 'Atendió / repartidor', width: 20 },
      { header: 'Consumo', kind: 'money', total: true },
      { header: 'Impuesto incluido', kind: 'money', total: true },
      { header: 'Propina', kind: 'money', total: true },
      { header: 'Efectivo', kind: 'money', total: true },
      { header: 'Transferencia / Bre-B', kind: 'money', total: true },
      { header: 'Tarjeta (datáfono)', kind: 'money', total: true },
      { header: 'Domicilio', kind: 'money', total: true },
    ],
    sales.map((s) => [dmy(s.date), s.at ? hm(s.at) : '', s.what, s.who, s.amount, taxIn(s.amount, taxRate), s.tip, s.pay.CASH, s.pay.TRANSFER, s.pay.CARD, s.fee]),
  );

  const waiters = new Map<string, { tables: number; sales: number; tips: number }>();
  for (const s of sales.filter((x) => x.at)) {
    const w = waiters.get(s.who) ?? { tables: 0, sales: 0, tips: 0 };
    waiters.set(s.who, { tables: w.tables + 1, sales: w.sales + s.amount, tips: w.tips + s.tip });
  }
  addSheet(
    wb,
    'Propinas por mesero',
    { ...info, title: 'Propinas por mesero', note: 'La propina es voluntaria y es del personal (Ley 1935 de 2018).' },
    [{ header: 'Mesero', width: 22 }, { header: 'Mesas cobradas', kind: 'int', total: true }, { header: 'Consumo', kind: 'money', total: true }, { header: 'Propinas', kind: 'money', total: true }],
    [...waiters].map(([name, w]) => [name, w.tables, w.sales, w.tips]),
  );

  addSheet(
    wb,
    'Anuladas',
    { ...info, title: 'Comandas anuladas', note: 'No se cobraron ni se descontaron del inventario.' },
    [
      { header: 'Fecha', width: 12 },
      { header: 'Hora', width: 11 },
      { header: 'Mesa', width: 14 },
      { header: 'Comanda', kind: 'int' },
      { header: 'Productos', width: 40 },
      { header: 'Valor', kind: 'money', total: true },
      { header: 'Quién la anuló', width: 18 },
      { header: 'Motivo', width: 20 },
      { header: 'Revisada', width: 10 },
    ],
    cancelled.map((k) => [dmy(toIsoDate(k.at)), hm(k.at), k.table, k.number, k.products, k.total, k.by, k.reason ? CANCEL_REASON_TEXT[k.reason as CancelReason] ?? k.reason : 'Sin motivo', k.reviewed ? 'Sí' : 'No']),
  );

  // Turnos del cajón (base, lo que debía haber y lo contado), si el negocio usa la caja.
  const shifts = await new CashDrawerService(prisma).history(organizationId, range.start, range.end);
  addSheet(
    wb,
    'Turnos de caja',
    { ...info, title: 'Turnos de caja', note: 'Cuenta a ciegas: si no cuadra, se cuenta otra vez; si tampoco, queda la diferencia y qué pasó.' },
    [
      { header: 'Abrió', width: 18 },
      { header: 'Quién abrió', width: 16 },
      { header: 'Base', kind: 'money' },
      { header: 'Cerró', width: 18 },
      { header: 'Quién cerró', width: 16 },
      { header: 'Debía haber', kind: 'money', total: true },
      { header: 'Contaron', kind: 'money', total: true },
      { header: 'Diferencia', kind: 'money', total: true },
      { header: 'Primer conteo', kind: 'money' },
      { header: 'Entradas', kind: 'money', total: true },
      { header: 'Salidas', kind: 'money', total: true },
      { header: 'Salidas sin factura', kind: 'int', total: true },
      { header: 'Qué pasó', width: 30 },
      { header: 'Revisado', width: 10 },
    ],
    [...shifts].reverse().map((s) => [
      `${dmy(toIsoDate(s.openedAt))} ${hm(s.openedAt)}`,
      s.openedBy,
      s.openingCash,
      `${dmy(toIsoDate(s.closedAt))} ${hm(s.closedAt)}`,
      s.closedBy,
      s.expected,
      s.counted,
      s.difference,
      s.firstCount,
      s.moves.filter((m) => m.kind === 'IN').reduce((a, m) => a + m.amount, 0),
      s.moves.filter((m) => m.kind === 'OUT').reduce((a, m) => a + m.amount, 0),
      s.moves.filter((m) => m.noReceipt).length,
      s.note ?? '',
      s.reviewedAt ? 'Sí' : '',
    ]),
  );

  return toBuffer(wb);
}
