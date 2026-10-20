import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { buildOrderLines } from '../kitchen/order-lines';
import { TicketLineDto } from './dto/restaurant.dto';

// El salón: mesas, mesas abiertas y sus comandas, y lo que se puede pedir. Lo ve el mesero (todas las mesas, para
// saber cuáles están libres) y cada cambio responde con el salón completo, como el estado de la cocina.
@Injectable()
export class FloorService {
  constructor(private readonly prisma: PrismaService) {}

  async load(organizationId: string, viewerId?: string) {
    const [tables, presentations] = await Promise.all([
      this.prisma.diningTable.findMany({
        where: { organizationId },
        orderBy: { position: 'asc' },
        include: {
          sessions: {
            where: { status: 'OPEN' },
            include: {
              waiter: { select: { id: true, name: true } },
              tickets: { orderBy: { number: 'asc' }, include: { lines: { include: { presentation: { include: { items: { include: { product: true } }, sizes: true } } } } } },
            },
          },
        },
      }),
      this.catalog(organizationId),
    ]);
    return {
      now: new Date().toISOString(),
      tables: tables.map((t) => {
        const s = t.sessions[0];
        return {
          id: t.id,
          name: t.name,
          session: s
            ? {
                id: s.id,
                openedAt: s.openedAt,
                waiter: s.waiter?.name ?? null,
                mine: !!viewerId && s.waiter?.id === viewerId,
                total: s.tickets.reduce((a, k) => a + k.lines.reduce((b, l) => b + l.qty * l.unitPrice, 0), 0),
                tickets: s.tickets.map((k) => ({
                  id: k.id,
                  number: k.number,
                  status: k.status,
                  sentAt: k.sentAt,
                  readyAt: k.readyAt,
                  lines: k.lines.map((l) => ({
                    qty: l.qty,
                    note: l.note,
                    name: [
                      l.presentation.name,
                      l.presentation.items.find((i) => i.productId === l.productId)?.product.name,
                      l.presentation.sizes.find((z) => z.id === l.sizeId)?.name,
                    ].filter(Boolean).join(' · '),
                  })),
                })),
              }
            : null,
        };
      }),
      catalog: presentations.map((p) => ({
        id: p.id,
        name: p.name,
        kind: p.kind,
        price: p.price,
        items: p.items.map((i) => ({ productId: i.productId, name: i.product.name, surcharge: i.surcharge })),
        sizes: p.sizes.map((z) => ({ id: z.id, name: z.name, price: z.price })),
      })),
    };
  }

  async open(organizationId: string, tableId: string, waiterId: string) {
    await this.servesTables(organizationId);
    const table = await this.prisma.diningTable.findUnique({ where: { id: tableId } });
    if (!table || table.organizationId !== organizationId) throw new NotFoundException('Mesa no encontrada.');
    const open = await this.prisma.tableSession.findFirst({ where: { tableId, status: 'OPEN' } });
    if (open) throw new BadRequestException(`${table.name} ya está abierta.`);
    await this.prisma.tableSession.create({ data: { organizationId, tableId, waiterId } });
    return this.load(organizationId, waiterId);
  }

  /** "Enviar a cocina": una comanda con el precio que pone el servidor (nunca el que mande el celular). */
  async send(organizationId: string, sessionId: string, lines: TicketLineDto[], waiterId: string) {
    await this.servesTables(organizationId);
    const session = await this.prisma.tableSession.findUnique({ where: { id: sessionId } });
    if (!session || session.organizationId !== organizationId) throw new NotFoundException('Mesa no encontrada.');
    if (session.status !== 'OPEN') throw new BadRequestException('Esta mesa ya se cerró.');
    const built = buildOrderLines(lines, await this.catalog(organizationId), new Set());
    await this.prisma.$transaction(async (tx) => {
      const number = (await tx.kitchenTicket.count({ where: { organizationId } })) + 1;
      await tx.kitchenTicket.create({
        data: {
          organizationId,
          sessionId,
          number,
          lines: { create: built.map((l, i) => ({ presentationId: l.presentationId, productId: l.productId, sizeId: l.sizeId, qty: l.qty, unitPrice: l.unitPrice, note: lines[i].note?.trim() || null })) },
        },
      });
    });
    return this.load(organizationId, waiterId);
  }

  private catalog(organizationId: string) {
    return this.prisma.presentation.findMany({
      where: { organizationId, active: true },
      orderBy: { name: 'asc' },
      include: { items: { include: { product: true } }, sizes: true },
    });
  }

  private async servesTables(organizationId: string) {
    const org = await this.prisma.organization.findUniqueOrThrow({ where: { id: organizationId }, select: { servesTables: true } });
    if (!org.servesTables) throw new ForbiddenException('Este negocio no atiende en mesas.');
  }
}
