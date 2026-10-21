import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { KitchenSnapshotService } from '../kitchen/kitchen-snapshot.service';
import { produce, withoutPackaging } from '../kitchen/produce';
import { toIsoDate } from '../kitchen/kitchen-dates';

const GONE = 'Esa comanda ya no está en cocina.';
const CANCELLED_LOOKBACK_MS = 36 * 60 * 60 * 1000;

// Comanda trabada en cocina (Julieth, 2026-10-21): la cocina no tocó "Listo" y la mesa no se puede cobrar. La caja
// (encargado de caja o la dueña) la destraba: "Ya salió de cocina" (se sirvió: descuenta insumos como "Listo") o
// "Anular comanda" (no se hizo: no se cobra ni descuenta, y queda guardada con quién la anuló para la dueña).
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
  async cancel(organizationId: string, ticketId: string, staffId?: string) {
    await this.sent(this.prisma, organizationId, ticketId);
    const staff = staffId ? await this.prisma.staffMember.findUnique({ where: { id: staffId }, select: { name: true } }) : null;
    const { count } = await this.prisma.kitchenTicket.updateMany({
      where: { id: ticketId, status: 'SENT' },
      data: { status: 'CANCELLED', cancelledAt: new Date(), cancelledBy: staff?.name ?? 'La dueña' },
    });
    if (!count) throw new BadRequestException(GONE);
  }

  // Las anuladas de hoy, para que la dueña las vea en Caja.
  async cancelledToday(organizationId: string) {
    const today = toIsoDate(new Date());
    const tickets = await this.prisma.kitchenTicket.findMany({
      where: { organizationId, status: 'CANCELLED', cancelledAt: { gte: new Date(Date.now() - CANCELLED_LOOKBACK_MS) } },
      orderBy: { cancelledAt: 'desc' },
      include: { lines: true, session: { include: { table: { select: { name: true } } } } },
    });
    return tickets
      .filter((k) => toIsoDate(k.cancelledAt!) === today)
      .map((k) => ({
        id: k.id,
        number: k.number,
        table: k.session.table.name,
        by: k.cancelledBy,
        at: k.cancelledAt,
        total: k.lines.reduce((a, l) => a + l.qty * l.unitPrice, 0),
      }));
  }

  private async sent(db: Prisma.TransactionClient, organizationId: string, ticketId: string) {
    const ticket = await db.kitchenTicket.findUnique({ where: { id: ticketId }, include: { lines: true, session: { select: { status: true } } } });
    if (!ticket || ticket.organizationId !== organizationId) throw new NotFoundException('Comanda no encontrada.');
    if (ticket.status !== 'SENT' || ticket.session.status !== 'OPEN') throw new BadRequestException(GONE);
    return ticket;
  }
}
