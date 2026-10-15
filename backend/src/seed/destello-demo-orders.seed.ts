// Pedidos (historial de 8 semanas, hoy y ayer) y ediciones especiales de "Cocina Destello".
// Lo llama destello-demo.seed.ts; solo para la BD LOCAL.
import { PrismaClient } from '@prisma/client';
import { addDays } from '../kitchen/kitchen-rules';

export async function seedOrdersAndEditions(
  prisma: PrismaClient,
  organizationId: string,
  today: string,
  P: Record<string, { id: string; price: number }>,
  couriers: { id: string }[],
) {

  let number = 1;
  const order = (data: {
    number?: number;
    customer: string;
    phone: string;
    address?: string;
    orderedOn: string;
    productionDate?: string;
    lines: [string, number][];
    delivery?: 'DELIVERY' | 'PICKUP';
    payment?: 'TRANSFER' | 'CASH';
    fee?: number;
    status?: 'PENDING' | 'ON_THE_WAY' | 'DELIVERED';
    produced?: boolean;
    courierId?: string;
  }) =>
    prisma.order.create({
      data: {
        organizationId,
        number: data.number ?? number++,
        customer: data.customer,
        phone: data.phone,
        address: data.delivery === 'PICKUP' ? null : (data.address ?? null),
        orderedOn: data.orderedOn,
        productionDate: data.productionDate ?? data.orderedOn,
        delivery: data.delivery ?? 'DELIVERY',
        payment: data.payment ?? 'TRANSFER',
        fee: data.delivery === 'PICKUP' ? 0 : (data.fee ?? 5000),
        status: data.status ?? 'DELIVERED',
        produced: data.produced ?? true,
        courierId: data.courierId,
        lines: { create: data.lines.map(([k, qty]) => ({ presentationId: P[k].id, qty, unitPrice: P[k].price })) },
      },
    });

  // Historial de 8 semanas (entregados) para la analítica.
  const CUSTOMERS = ['Laura Pérez', 'Diego Rojas', 'Camila Torres', 'Juan Gómez', 'Sara Muñoz', 'Andrés López', 'Natalia Díaz', 'Felipe Ríos'];
  const MIX: [string, number][][] = [
    [['x9chips', 1]], [['x9doble', 1]], [['surtida', 1], ['rollo1', 2]], [['x3rollos', 1]], [['x9chips', 2]],
    [['x6rollos', 1]], [['brioche1', 1], ['x9chips', 1]], [['halloween', 1]], [['x3rollos', 1], ['x9doble', 1]], [['brioche2x1', 1]],
  ];
  for (let daysAgo = 56; daysAgo >= 1; daysAgo--) {
    const day = addDays(today, -daysAgo);
    if (new Date(`${day}T12:00:00`).getDay() === 0) continue;
    const count = 2 + ((daysAgo * 7) % 4) + (daysAgo < 28 ? 1 : 0);
    for (let i = 0; i < count; i++) {
      const lines = MIX[(daysAgo * 3 + i * 5) % MIX.length];
      if (lines.some(([k]) => k === 'halloween') && daysAgo > 5) continue;
      await order({
        customer: CUSTOMERS[(daysAgo + i) % CUSTOMERS.length],
        phone: `30${(daysAgo * 13 + i) % 10} 555 ${String(1000 + daysAgo * 7 + i).slice(-4)}`,
        address: 'Bogotá',
        orderedOn: day,
        lines,
        payment: i % 3 === 0 ? 'CASH' : 'TRANSFER',
        courierId: couriers[i % couriers.length].id,
      });
    }
  }

  // Pedidos de hoy y de ayer (los mismos del diseño).
  await order({ number: 1041, customer: 'Valentina Gómez', phone: '312 555 0198', address: 'Cra 7 # 72-14, apto 502', orderedOn: today, lines: [['x9chips', 2]], fee: 6000, status: 'PENDING', produced: false });
  await order({ number: 1042, customer: 'Andrés Molina', phone: '300 812 4410', address: 'Calle 93 # 11-30', orderedOn: today, lines: [['x3rollos', 1], ['surtida', 1]], payment: 'CASH', fee: 5000, status: 'PENDING', produced: false });
  await order({ number: 1043, customer: 'Daniela Ríos', phone: '318 220 7733', orderedOn: today, lines: [['x6rollos', 1]], delivery: 'PICKUP', status: 'PENDING', produced: false });
  await order({ number: 1044, customer: 'Felipe Castro', phone: '301 777 9012', address: 'Av. 19 # 104-60, torre 2', orderedOn: today, lines: [['halloween', 2], ['brioche1', 1]], fee: 7000, status: 'PENDING', produced: false });
  await order({ number: 1039, customer: 'Mariana Peña', phone: '314 090 3366', address: 'Calle 53 # 24-08', orderedOn: addDays(today, -1), lines: [['x9doble', 1]], payment: 'CASH', status: 'ON_THE_WAY', courierId: couriers[0].id });
  await order({ number: 1038, customer: 'Sebastián Duarte', phone: '305 600 1245', address: 'Cra 50 # 98-21', orderedOn: addDays(today, -1), lines: [['x9chips', 1], ['rollo1', 2]], fee: 6000, courierId: couriers[1].id });

  const edition = (name: string, description: string, startDate: string, endDate: string, cap: number, look: string, color: string, keys: string[]) =>
    prisma.edition.create({
      data: {
        organizationId,
        name,
        description,
        startDate,
        endDate,
        cap,
        look,
        color,
        presentations: { create: keys.map((k) => ({ presentationId: P[k].id })) },
      },
    });
  const year = Number(today.slice(0, 4));
  await edition('Halloween de Destello', 'Galletas con calabaza y doble chocolate en caja naranja.', addDays(today, -5), `${year}-10-31`, 80, 'pump', 'peach', ['halloween']);
  await edition('Navidad dulce', 'Caja de regalo con galletas surtidas y rollos.', `${year}-12-01`, `${year}-12-22`, 150, 'star', 'lilac', ['surtida', 'x6rollos']);
}
