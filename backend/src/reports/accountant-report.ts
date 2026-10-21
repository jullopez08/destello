import type { PrismaService } from '../prisma/prisma.service';
import type { ReportRange } from './report-range';
import { daysOf, salesData, type Sale } from './sales-data';
import { addSheet, dmy, toBuffer, workbook } from './xlsx';

const TAX_NAME = { NONE: 'Sin impuesto (no responsable)', INC: 'Impuesto al consumo 8 %', IVA: 'IVA 19 %' } as const;
const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

// Ventas para el contador (Julieth, 2026-10-21): el impuesto al consumo se declara cada bimestre (formulario 310,
// art. 512-1 y ss. del Estatuto Tributario) sobre la venta sin impuesto. Los precios ya lo traen incluido, así que
// aquí se separa: base, impuesto y la propina aparte (es voluntaria y no hace parte de la base). Destello no emite
// factura electrónica: esto es un resumen para el contador, no una declaración.
export async function accountantReport(prisma: PrismaService, organizationId: string, range: ReportRange) {
  const { business, salesTax, taxRate, sales } = await salesData(prisma, organizationId, range);
  const wb = workbook();
  const note = salesTax === 'NONE'
    ? 'No cobras impuesto: la base es igual a lo vendido. Confírmalas con tu contador.'
    : `${TAX_NAME[salesTax]}, incluido en los precios. La propina no hace parte de la base. Confírmalas con tu contador.`;
  const split = (total: number) => {
    const base = Math.round(total / (1 + taxRate));
    return [total, base, total - base] as const;
  };
  const row = (label: string, list: Sale[]) => {
    const total = list.reduce((a, s) => a + s.amount, 0);
    return [label, ...split(total), list.reduce((a, s) => a + s.tip, 0), list.reduce((a, s) => a + s.fee, 0)];
  };
  const cols = (first: string) => [
    { header: first, width: 16 },
    { header: 'Ventas (impuesto incluido)', kind: 'money' as const, total: true },
    { header: 'Base sin impuesto', kind: 'money' as const, total: true },
    { header: 'Impuesto', kind: 'money' as const, total: true },
    { header: 'Propinas (no son base)', kind: 'money' as const, total: true },
    { header: 'Domicilios (repartidor)', kind: 'money' as const, total: true },
  ];

  addSheet(wb, 'Por día', { business, range, title: 'Ventas para el contador', note }, cols('Fecha'), daysOf(range).map((d) => row(dmy(d), sales.filter((s) => s.date === d))));

  // Bimestres: ene-feb, mar-abr… (los periodos del impuesto al consumo).
  const bimesters = new Map<string, Sale[]>();
  for (const s of sales) {
    const [y, m] = s.date.split('-').map(Number);
    const first = m % 2 ? m : m - 1;
    const key = `${MONTHS[first - 1]}-${MONTHS[first]} ${y}`;
    bimesters.set(key, [...(bimesters.get(key) ?? []), s]);
  }
  addSheet(wb, 'Por bimestre', { business, range, title: 'Por bimestre', note: 'Solo lo que cae dentro de las fechas elegidas.' }, cols('Bimestre'), [...bimesters].map(([k, list]) => row(k, list)));

  const products = new Map<string, { qty: number; total: number }>();
  for (const l of sales.flatMap((s) => s.lines)) {
    const p = products.get(l.name) ?? { qty: 0, total: 0 };
    products.set(l.name, { qty: p.qty + l.qty, total: p.total + l.total });
  }
  addSheet(
    wb,
    'Por producto',
    { business, range, title: 'Ventas por producto' },
    [
      { header: 'Producto', width: 36 },
      { header: 'Cantidad', kind: 'int', total: true },
      { header: 'Ventas (impuesto incluido)', kind: 'money', total: true },
      { header: 'Base sin impuesto', kind: 'money', total: true },
      { header: 'Impuesto', kind: 'money', total: true },
    ],
    [...products].sort((a, b) => b[1].total - a[1].total).map(([name, p]) => [name, p.qty, ...split(p.total)]),
  );

  return toBuffer(wb);
}
