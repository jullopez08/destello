import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { KitchenSnapshotService } from '../kitchen/kitchen-snapshot.service';
import { produce, withoutPackaging } from '../kitchen/produce';
import { toIsoDate } from '../kitchen/kitchen-rules';

const READY_VISIBLE_MS = 30 * 60 * 1000;

type Named = { presentation: { name: string; items: { productId: string; product: { name: string } }[]; sizes: { id: string; name: string }[] }; productId: string | null; sizeId: string | null };
const lineName = (l: Named) =>
  [l.presentation.name, l.presentation.items.find((i) => i.productId === l.productId)?.product.name, l.presentation.sizes.find((z) => z.id === l.sizeId)?.name]
    .filter(Boolean)
    .join(' · ');
const withNames = { presentation: { include: { items: { include: { product: true } }, sizes: true } } } as const;

// Pantalla de cocina (tablet fija): las comandas de las mesas con su reloj y los pedidos del día (domicilio o
// recoger), todo en un solo lugar (Julieth, 2026-10-19). "Listo" descuenta los insumos igual que la producción.
@Injectable()
export class KitchenScreenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly snapshot: KitchenSnapshotService,
  ) {}

  async load(organizationId: string) {
    const now = new Date();
    const [org, tickets, orders] = await Promise.all([
      this.prisma.organization.findUniqueOrThrow({ where: { id: organizationId }, select: { kitchenNormalMin: true, kitchenMaxMin: true } }),
      this.prisma.kitchenTicket.findMany({
        where: { organizationId, OR: [{ status: 'SENT' }, { status: 'READY', readyAt: { gte: new Date(now.getTime() - READY_VISIBLE_MS) } }] },
        orderBy: { sentAt: 'asc' },
        include: { lines: { include: withNames }, session: { include: { table: true, waiter: { select: { name: true } } } } },
      }),
      this.prisma.order.findMany({
        where: { organizationId, productionDate: toIsoDate(now), status: OrderStatus.PENDING, produced: false },
        orderBy: { number: 'asc' },
        include: { lines: { include: withNames } },
      }),
    ]);
    return {
      now: now.toISOString(),
      normalMin: org.kitchenNormalMin,
      maxMin: org.kitchenMaxMin,
      tickets: tickets.map((k) => ({
        id: k.id,
        number: k.number,
        status: k.status,
        sentAt: k.sentAt,
        readyAt: k.readyAt,
        table: k.session.table.name,
        waiter: k.session.waiter?.name ?? null,
        lines: k.lines.map((l) => ({ name: lineName(l), qty: l.qty, note: l.note })),
      })),
      orders: orders.map((o) => ({
        id: o.id,
        number: o.number,
        customer: o.customer,
        delivery: o.delivery,
        lines: o.lines.map((l) => ({ name: lineName(l), qty: l.qty })),
      })),
    };
  }

  /** "Listo": descuenta lo que lleva (sin empaques: se come en la mesa) y le avisa al mesero. */
  async ready(organizationId: string, ticketId: string) {
    await this.prisma.$transaction(async (tx) => {
      const ticket = await tx.kitchenTicket.findUnique({ where: { id: ticketId }, include: { lines: true } });
      if (!ticket || ticket.organizationId !== organizationId) throw new NotFoundException('Comanda no encontrada.');
      // Solo uno la marca aunque toquen dos veces: así no se descuenta doble.
      const { count } = await tx.kitchenTicket.updateMany({ where: { id: ticketId, status: 'SENT' }, data: { status: 'READY', readyAt: new Date() } });
      if (!count) throw new BadRequestException('Esa comanda ya estaba lista.');
      const data = withoutPackaging(await this.snapshot.ruleData(organizationId, tx));
      await produce(tx, organizationId, ticket.lines, data, false);
    });
    return this.load(organizationId);
  }
}
