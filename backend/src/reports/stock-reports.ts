import type { PrismaService } from '../prisma/prisma.service';
import { toIsoDate } from '../kitchen/kitchen-dates';
import { lineName, withNames } from '../restaurant/kitchen-screen.service';
import type { ReportRange } from './report-range';
import { addSheet, dmy, qtyUnit, toBuffer, workbook } from './xlsx';

const STATUS = { PENDING: 'Pendiente', ON_THE_WAY: 'En camino', DELIVERED: 'Entregado', CANCELLED: 'Cancelado' } as const;

// Pedidos del rango (por su día de entrega), uno por fila, como se ven en Pedidos.
export async function ordersReport(prisma: PrismaService, organizationId: string, range: ReportRange) {
  const [org, orders] = await Promise.all([
    prisma.organization.findUniqueOrThrow({ where: { id: organizationId }, select: { name: true } }),
    prisma.order.findMany({
      where: { organizationId, productionDate: { gte: range.from, lte: range.to } },
      orderBy: [{ productionDate: 'asc' }, { number: 'asc' }],
      include: { courier: { select: { name: true } }, lines: { include: withNames } },
    }),
  ]);
  const wb = workbook();
  addSheet(
    wb,
    'Pedidos',
    { business: org.name, range, title: 'Pedidos', note: 'Por día de entrega. Los cancelados salen, pero no suman en Ventas ni en Caja.' },
    [
      { header: 'Pedido', kind: 'int' },
      { header: 'Pedido el', width: 12 },
      { header: 'Entrega', width: 12 },
      { header: 'Cliente', width: 22 },
      { header: 'Teléfono', width: 14 },
      { header: 'Dirección', width: 28 },
      { header: 'Cómo', width: 11 },
      { header: 'Pago', width: 14 },
      { header: 'Productos', width: 44 },
      { header: 'Valor', kind: 'money', total: true },
      { header: 'Domicilio', kind: 'money', total: true },
      { header: 'Estado', width: 12 },
      { header: 'Repartidor', width: 16 },
    ],
    orders.map((o) => [
      o.number,
      dmy(o.orderedOn),
      dmy(o.productionDate),
      o.customer,
      o.phone ?? '',
      o.address ?? '',
      o.delivery === 'PICKUP' ? 'Recoge' : 'Domicilio',
      o.payment === 'CASH' ? 'Efectivo' : 'Transferencia',
      o.lines.map((l) => `${l.qty} × ${lineName(l)}`).join(', '),
      o.status === 'CANCELLED' ? 0 : o.lines.reduce((a, l) => a + l.qty * l.unitPrice, 0),
      o.status === 'CANCELLED' ? 0 : o.fee,
      STATUS[o.status],
      o.courier?.name ?? '',
    ]),
  );
  return toBuffer(wb);
}

// Inventario (Julieth, 2026-10-21; como los informes de inventario de Restaurant365 o Maitre'D): lo que hay hoy con su
// valor al costo promedio, lo que vence y lo botado en el rango. Destello no guarda cuánto había cada día, así que el
// inventario es el de hoy; las compras del rango van en el Excel de Compras.
export async function inventoryReport(prisma: PrismaService, organizationId: string, range: ReportRange) {
  const today = toIsoDate(new Date());
  const [org, supplies, supplyWaste, doughWaste] = await Promise.all([
    prisma.organization.findUniqueOrThrow({ where: { id: organizationId }, select: { name: true } }),
    prisma.supply.findMany({
      where: { organizationId },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
      include: { supplier: { select: { name: true } }, batches: { where: { left: { gt: 0 } }, orderBy: { expiresOn: 'asc' } } },
    }),
    prisma.supplyWaste.findMany({ where: { organizationId, date: { gte: range.from, lte: range.to } }, orderBy: { date: 'asc' }, include: { supply: true } }),
    prisma.doughWaste.findMany({ where: { organizationId, date: { gte: range.from, lte: range.to } }, orderBy: { date: 'asc' }, include: { recipe: { select: { name: true } } } }),
  ]);
  const wb = workbook();
  addSheet(
    wb,
    'Inventario hoy',
    { business: org.name, title: `Inventario al ${dmy(today)}`, note: 'Valor = lo que hay × costo promedio de las compras.' },
    [
      { header: 'Insumo', width: 26 },
      { header: 'Tipo', width: 12 },
      { header: 'Hay', kind: 'qty' },
      { header: 'Unidad', width: 8 },
      { header: 'Mínimo', kind: 'qty' },
      { header: 'Costo por unidad', kind: 'money' },
      { header: 'Valor', kind: 'money', total: true },
      { header: 'Proveedor', width: 18 },
      { header: 'Próximo vencimiento', width: 14 },
      { header: '¿Bajo el mínimo?', width: 10 },
    ],
    supplies.map((s) => {
      const [stock, unit] = qtyUnit(s.stock, s.kind);
      const per = s.kind === 'UNIT' ? 1 : 1000;
      return [
        s.name,
        s.category === 'PACKAGING' ? 'Empaque' : 'Ingrediente',
        stock,
        unit,
        qtyUnit(s.min, s.kind)[0],
        Math.round(s.cost * per),
        Math.round(s.stock * s.cost),
        s.supplier?.name ?? '',
        s.batches[0] ? dmy(s.batches[0].expiresOn) : '',
        s.stock < s.min ? 'Sí' : '',
      ];
    }),
  );
  addSheet(
    wb,
    'Por vencer',
    { business: org.name, title: 'Lotes con fecha de vencimiento' },
    [{ header: 'Insumo', width: 26 }, { header: 'Queda', kind: 'qty' }, { header: 'Unidad', width: 8 }, { header: 'Vence', width: 12 }, { header: 'Recibido', width: 12 }, { header: 'Estado', width: 12 }],
    supplies.flatMap((s) => s.batches.map((b) => [s.name, ...qtyUnit(b.left, s.kind), dmy(b.expiresOn), dmy(b.receivedOn), b.expiresOn < today ? 'Vencido' : ''])),
  );
  addSheet(
    wb,
    'Botado',
    { business: org.name, range, title: 'Lo que se botó', note: 'Masa vencida e insumos vencidos, con su costo de ese día.' },
    [{ header: 'Fecha', width: 12 }, { header: 'Qué', width: 28 }, { header: 'Cantidad', kind: 'qty' }, { header: 'Unidad', width: 8 }, { header: 'Costo', kind: 'money', total: true }],
    [
      ...supplyWaste.map((w) => [w.date, w.supply.name, ...qtyUnit(w.qty, w.supply.kind), w.cost] as const),
      ...doughWaste.map((w) => [w.date, /^masa/i.test(w.recipe.name) ? w.recipe.name : `Masa de ${w.recipe.name}`, ...qtyUnit(w.grams, 'MASS'), w.cost] as const),
    ]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([d, ...rest]) => [dmy(d), ...rest]),
  );
  return toBuffer(wb);
}

// Compras del rango, por línea y por proveedor.
export async function purchasesReport(prisma: PrismaService, organizationId: string, range: ReportRange) {
  const [org, purchases] = await Promise.all([
    prisma.organization.findUniqueOrThrow({ where: { id: organizationId }, select: { name: true } }),
    prisma.purchase.findMany({
      where: { organizationId, date: { gte: range.from, lte: range.to } },
      orderBy: { date: 'asc' },
      include: { supplier: { select: { name: true } }, lines: { include: { supply: true } } },
    }),
  ]);
  const wb = workbook();
  const lines = purchases.flatMap((p) => p.lines.map((l) => ({ date: p.date, supplier: p.supplier?.name ?? 'Sin proveedor', l })));
  addSheet(
    wb,
    'Compras',
    { business: org.name, range, title: 'Compras' },
    [{ header: 'Fecha', width: 12 }, { header: 'Proveedor', width: 20 }, { header: 'Insumo', width: 26 }, { header: 'Cantidad', kind: 'qty' }, { header: 'Unidad', width: 8 }, { header: 'Total', kind: 'money', total: true }, { header: 'Precio por unidad', kind: 'money' }],
    lines.map(({ date, supplier, l }) => {
      const [qty, unit] = qtyUnit(l.qty, l.supply.kind);
      return [dmy(date), supplier, l.supply.name, qty, unit, l.total, qty ? Math.round(l.total / qty) : 0];
    }),
  );
  const bySupplier = new Map<string, { count: Set<string>; total: number }>();
  for (const p of purchases) {
    const name = p.supplier?.name ?? 'Sin proveedor';
    const s = bySupplier.get(name) ?? { count: new Set<string>(), total: 0 };
    s.count.add(p.id);
    bySupplier.set(name, { count: s.count, total: s.total + p.lines.reduce((a, l) => a + l.total, 0) });
  }
  addSheet(
    wb,
    'Por proveedor',
    { business: org.name, range, title: 'Compras por proveedor' },
    [{ header: 'Proveedor', width: 22 }, { header: 'Compras', kind: 'int', total: true }, { header: 'Total', kind: 'money', total: true }],
    [...bySupplier].sort((a, b) => b[1].total - a[1].total).map(([name, s]) => [name, s.count.size, s.total]),
  );
  return toBuffer(wb);
}
