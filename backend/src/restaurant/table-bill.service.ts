import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TAX_RATE } from '../kitchen/kitchen-costs';
import { paymentProblem, tipFor } from './bill-rules';
import { CloseTableDto } from './dto/restaurant.dto';

// La cuenta de una mesa: pedirla (en el mapa sale "Cuenta") y cobrarla con una forma de pago o varias, con la propina
// sugerida si el cliente la acepta. Lo consumido y la propina los calcula el servidor con los precios de cada comanda.
// `waiterId`: el mesero solo cobra sus mesas; sin él (la caja, desde el panel de la dueña) cobra cualquiera.
@Injectable()
export class TableBillService {
  constructor(private readonly prisma: PrismaService) {}

  async request(organizationId: string, sessionId: string, waiterId?: string) {
    const session = await this.openSession(organizationId, sessionId, waiterId);
    if (!session.tickets.length) throw new BadRequestException('Esta mesa aún no ha pedido nada.');
    await this.prisma.tableSession.update({ where: { id: sessionId }, data: { billAt: new Date() } });
  }

  async close(organizationId: string, sessionId: string, dto: CloseTableDto, waiterId?: string) {
    const session = await this.openSession(organizationId, sessionId, waiterId);
    if (session.tickets.some((k) => k.status === 'SENT')) throw new BadRequestException('Aún hay una comanda en cocina.');
    const subtotal = session.tickets.reduce((a, k) => a + k.lines.reduce((b, l) => b + l.qty * l.unitPrice, 0), 0);
    const { salesTax } = await this.prisma.organization.findUniqueOrThrow({ where: { id: organizationId }, select: { salesTax: true } });
    const tip = dto.tip && subtotal > 0 ? tipFor(subtotal, TAX_RATE[salesTax]) : 0;
    const problem = paymentProblem(subtotal + tip, dto.payments);
    if (problem) throw new BadRequestException(problem);
    await this.prisma.$transaction(async (tx) => {
      // Solo una persona la cierra aunque toquen al tiempo (el mesero y la caja): así no se cobra doble.
      const { count } = await tx.tableSession.updateMany({
        where: { id: sessionId, status: 'OPEN' },
        data: { status: 'CLOSED', closedAt: new Date(), subtotal, tip },
      });
      if (!count) throw new BadRequestException('Esta mesa ya se cobró.');
      await tx.tablePayment.createMany({ data: dto.payments.map((p) => ({ organizationId, sessionId, method: p.method, amount: p.amount })) });
    });
  }

  private async openSession(organizationId: string, sessionId: string, waiterId?: string) {
    const session = await this.prisma.tableSession.findUnique({ where: { id: sessionId }, include: { tickets: { where: { status: { not: 'CANCELLED' } }, include: { lines: true } } } });
    if (!session || session.organizationId !== organizationId) throw new NotFoundException('Mesa no encontrada.');
    if (session.status !== 'OPEN') throw new BadRequestException('Esta mesa ya se cobró.');
    if (waiterId && session.waiterId !== waiterId) throw new ForbiddenException('Esta mesa la atiende otra persona.');
    return session;
  }
}
