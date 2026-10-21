import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { KitchenSnapshotService } from '../kitchen/kitchen-snapshot.service';
import { produce, withoutPackaging } from '../kitchen/produce';
import type { CancelReason } from './cancel-reasons';
import { lineName, withNames } from './kitchen-screen.service';

const GONE = 'Esa comanda ya no está en cocina.';
/** Historial de anuladas en Caja: 30 días. */
const CANCELLED_DAYS = 30;

// Comanda trabada en cocina (Julieth, 2026-10-21): la cocina no tocó "Listo" y la mesa no se puede cobrar. La caja
// (encargado de caja o la dueña) la destraba: "Ya salió de cocina" (se sirvió: descuenta insumos como "Listo") o
// "Anular comanda" (no se hizo: no se cobra ni descuenta). Cada anulación lleva motivo y queda en Caja con sus productos,
// quién y cuándo, para que la dueña la revise (como los informes de anulaciones de Toast o Aloha).
@Injectable()
export class StuckTicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly snapshot: KitchenSnapshotService,
  ) {}

  async out(organizationId: string, ticketId: string) {
    await this.prisma.$transaction(async (tx) => {
      const ticket = await this.sent(tx, organizationId, ticketId);
      // Servida sin readyAt: "¿Qué platos tardan más en cocina?" no cuenta la espera del olvido.
      const { count } = await tx.kitchenTicket.updateMany({ where: { id: ticketId, status: 'SENT' }, data: { status: 'SERVED', servedAt: new Date() } });
      if (!count) throw new BadRequestException(GONE);
      const data = withoutPackaging(await this.snapshot.ruleData(organizationId, tx));
      await produce(tx, organizationId, ticket.lines, data, false);
    });
  }

  /** `staffId`: el encargado de caja que la anula; sin él, la dueña desde Caja. */
  async cancel(organizationId: string, ticketId: string, reason: CancelReason, staffId?: string) {
    await this.sent(this.prisma, organizationId, ticketId);
    const staff = staffId ? await this.prisma.staffMember.findUnique({ where: { id: staffId }, select: { name: true } }) : null;
    const { count } = await this.prisma.kitchenTicket.updateMany({
      where: { id: ticketId, status: 'SENT' },
      data: { status: 'CANCELLED', cancelledAt: new Date(), cancelledBy: staff?.name ?? 'La dueña', cancelReason: reason },
    });
    if (!count) throw new BadRequestException(GONE);
  }

  // Las anuladas de los últimos 30 días, con lo que llevaba (no se descontó del inventario), para revisarlas en Caja.
  async cancelled(organizationId: string) {
    const tickets = await this.prisma.kitchenTicket.findMany({
      where: { organizationId, status: 'CANCELLED', cancelledAt: { gte: new Date(Date.now() - CANCELLED_DAYS * 86_400_000) } },
      orderBy: { cancelledAt: 'desc' },
      include: { lines: { include: withNames }, session: { include: { table: { select: { name: true } } } } },
    });
    return tickets.map((k) => ({
      id: k.id,
      number: k.number,
      table: k.session.table.name,
      by: k.cancelledBy,
      reason: k.cancelReason,
      sentAt: k.sentAt,
      at: k.cancelledAt,
      reviewedAt: k.cancelReviewedAt,
      lines: k.lines.map((l) => ({ name: lineName(l), qty: l.qty })),
      total: k.lines.reduce((a, l) => a + l.qty * l.unitPrice, 0),
    }));
  }

  // La dueña la revisó: ya no sale en "Por revisar".
  async review(organizationId: string, ticketId: string) {
    const { count } = await this.prisma.kitchenTicket.updateMany({
      where: { id: ticketId, organizationId, status: 'CANCELLED' },
      data: { cancelReviewedAt: new Date() },
    });
    if (!count) throw new NotFoundException('Comanda no encontrada.');
  }

  private async sent(db: Prisma.TransactionClient, organizationId: string, ticketId: string) {
    const ticket = await db.kitchenTicket.findUnique({ where: { id: ticketId }, include: { lines: true, session: { select: { status: true } } } });
    if (!ticket || ticket.organizationId !== organizationId) throw new NotFoundException('Comanda no encontrada.');
    if (ticket.status !== 'SENT' || ticket.session.status !== 'OPEN') throw new BadRequestException(GONE);
    return ticket;
  }
}
