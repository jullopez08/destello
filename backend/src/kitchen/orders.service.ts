import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { KitchenSnapshotService } from './kitchen-snapshot.service';
import { productionDateFor, toIsoDate } from './kitchen-rules';
import { produce } from './produce';
import { CreateEditionDto, CreateOrderDto } from './dto/kitchen.dto';
import { buildOrderLines, lineKey } from './order-lines';

@Injectable()
export class OrdersService {

  constructor(
    private readonly prisma: PrismaService,
    private readonly snapshot: KitchenSnapshotService,
  ) {}

  // El pedido se produce el día que toca según la hora de corte y los días sin
  // producción. Guarda el precio de cada línea tal como estaba al pedirla.
  async createOrder(organizationId: string, dto: CreateOrderDto) {
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      const lines = await this.orderLines(tx, organizationId, dto, toIsoDate(now));
      const organization = await tx.organization.update({
        where: { id: organizationId },
        data: { nextOrderNumber: { increment: 1 } },
      });
      await tx.order.create({
        data: {
          organizationId,
          number: organization.nextOrderNumber - 1,
          ...orderFields(dto),
          orderedOn: toIsoDate(now),
          productionDate: productionDateFor(now, organization.orderCutoff, organization.closedDays),
          lines: { create: lines },
        },
      });
    });
    return this.snapshot.load(organizationId);
  }

  // Editar (Julieth, 2026-10-21: el cliente cambia de idea o se escribió mal). Solo antes de producirlo, como
  // cancelar: después ya se gastó la masa. Sigue con su número y su día de producción; lo que ya estaba conserva
  // su precio aunque hoy esté pausado o la edición cerrada. Si su día de producción ya pasó, no se edita
  // (Julieth, 2026-10-22): se cancela.
  async updateOrder(organizationId: string, id: string, dto: CreateOrderDto) {
    await this.ownOrder(id, organizationId);
    const today = toIsoDate(new Date());
    await this.prisma.$transaction(async (tx) => {
      const before = await tx.orderLine.findMany({ where: { orderId: id } });
      const lines = await this.orderLines(tx, organizationId, dto, today, before);
      const kept = new Map(before.map((l) => [lineKey(l), l.unitPrice]));
      // Con la condición en el mismo cambio: si justo se registró la producción, no se toca.
      const { count } = await tx.order.updateMany({
        where: { id, organizationId, status: OrderStatus.PENDING, produced: false, productionDate: { gte: today } },
        data: orderFields(dto),
      });
      if (!count) throw new BadRequestException('Solo se editan pedidos por producir hoy o más adelante.');
      await tx.orderLine.deleteMany({ where: { orderId: id } });
      await tx.orderLine.createMany({
        data: lines.map((l) => ({ ...l, orderId: id, unitPrice: kept.get(lineKey(l)) ?? l.unitPrice })),
      });
    });
    return this.snapshot.load(organizationId);
  }

  // Lo que se vende, de esta empresa, a la venta y con su edición abierta. `before`: lo que ya tenía el pedido.
  private async orderLines(tx: Prisma.TransactionClient, organizationId: string, dto: CreateOrderDto, today: string, before: { presentationId: string }[] = []) {
    const ids = [...new Set(dto.lines.map((l) => l.presentationId))];
    const presentations = await tx.presentation.findMany({
      where: { organizationId, id: { in: ids } },
      include: { items: true, sizes: true, editions: { include: { edition: true } } },
    });
    if (presentations.length !== ids.length) throw new BadRequestException('Algún producto no existe.');
    for (const p of presentations) {
      if (before.some((l) => l.presentationId === p.id)) continue;
      if (!p.active) throw new BadRequestException(`"${p.name}" está pausada y no se puede vender.`);
      assertEditionOpen(p, today);
    }
    const packaging = await tx.supply.findMany({ where: { organizationId, category: 'PACKAGING' }, select: { id: true } });
    return buildOrderLines(dto.lines, presentations, new Set(packaging.map((x) => x.id)));
  }

  // Sale con un repartidor. El cliente solo recibe el aviso de que va en camino.
  async sendOrder(organizationId: string, id: string, courierId: string) {
    const order = await this.ownOrder(id, organizationId);
    if (order.status !== OrderStatus.PENDING || !order.produced) {
      throw new BadRequestException('Solo se envían pedidos ya producidos.');
    }
    const courier = await this.prisma.courier.findUnique({ where: { id: courierId } });
    if (!courier || courier.organizationId !== organizationId) throw new NotFoundException('Repartidor no encontrado.');

    await this.prisma.order.update({ where: { id }, data: { status: OrderStatus.ON_THE_WAY, courierId } });
    return this.snapshot.load(organizationId);
  }

  // En camino → entregado. Un pedido que recogen en la cocina se entrega
  // directo, apenas está producido.
  async deliverOrder(organizationId: string, id: string) {
    const order = await this.ownOrder(id, organizationId);
    const pickupReady = order.status === OrderStatus.PENDING && order.produced && order.delivery === 'PICKUP';
    if (order.status !== OrderStatus.ON_THE_WAY && !pickupReady) {
      throw new BadRequestException('Este pedido todavía no se puede marcar como entregado.');
    }
    await this.prisma.order.update({ where: { id }, data: { status: OrderStatus.DELIVERED, deliveredAt: new Date() } });
    return this.snapshot.load(organizationId);
  }

  // Solo antes de producirlo: después ya se gastó la masa y el empaque.
  async cancelOrder(organizationId: string, id: string) {
    const order = await this.ownOrder(id, organizationId);
    if (order.status !== OrderStatus.PENDING || order.produced) {
      throw new BadRequestException('Solo se cancelan pedidos que aún no se han producido.');
    }
    await this.prisma.order.update({ where: { id }, data: { status: OrderStatus.CANCELLED } });
    return this.snapshot.load(organizationId);
  }

  // "Registrar producción terminada": toma la masa de los lotes (primero el
  // que vence antes), descuenta los insumos de la masa nueva, los empaques y
  // los extras, y deja los pedidos listos para enviar.
  async registerProduction(organizationId: string, date: string) {
    await this.prisma.$transaction(async (tx) => {
      const pending = await tx.order.findMany({
        where: { organizationId, productionDate: date, status: OrderStatus.PENDING, produced: false },
        include: { lines: true },
      });
      if (!pending.length) throw new BadRequestException('No hay pedidos por producir ese día.');

      const data = await this.snapshot.ruleData(organizationId, tx);
      await produce(tx, organizationId, pending.flatMap((o) => o.lines), data, true);
      await tx.order.updateMany({ where: { id: { in: pending.map((o) => o.id) } }, data: { produced: true } });
    });
    return this.snapshot.load(organizationId);
  }

  // ── Ediciones especiales ──

  async createEdition(organizationId: string, dto: CreateEditionDto) {
    if (dto.endDate < dto.startDate) throw new BadRequestException('La fecha de cierre debe ser después del inicio.');
    const ids = [...new Set(dto.presentationIds)];
    const found = await this.prisma.presentation.count({ where: { organizationId, id: { in: ids } } });
    if (found !== ids.length) throw new BadRequestException('Alguna presentación no existe.');

    await this.prisma.edition.create({
      data: {
        organizationId,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        startDate: dto.startDate,
        endDate: dto.endDate,
        look: dto.look,
        color: dto.color,
        presentations: { create: ids.map((presentationId) => ({ presentationId })) },
      },
    });
    return this.snapshot.load(organizationId);
  }

  // Lo que se vendía queda como está, o con `hide` se desactiva lo que solo
  // se vendía en esta edición (deja de salir en pedidos; los anteriores no cambian).
  async removeEdition(organizationId: string, id: string, hide = false) {
    const edition = await this.prisma.edition.findFirst({ where: { id, organizationId }, include: { presentations: true } });
    if (!edition) throw new NotFoundException('Edición no encontrada.');
    const ids = edition.presentations.map((p) => p.presentationId);
    const shared = await this.prisma.editionPresentation.findMany({ where: { presentationId: { in: ids }, editionId: { not: id } } });
    const only = ids.filter((pid) => !shared.some((s) => s.presentationId === pid));
    await this.prisma.$transaction([
      ...(hide && only.length ? [this.prisma.presentation.updateMany({ where: { organizationId, id: { in: only } }, data: { active: false } })] : []),
      this.prisma.edition.delete({ where: { id } }),
    ]);
    return this.snapshot.load(organizationId);
  }

  private async ownOrder(id: string, organizationId: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order || order.organizationId !== organizationId) throw new NotFoundException('Pedido no encontrado.');
    return order;
  }
}

// Lo de una edición especial solo se vende mientras alguna de sus ediciones
// esté entre sus fechas. Ya no hay cupo: la cantidad la decide lo que se produzca.
function assertEditionOpen(presentation: { name: string; editions: { edition: { startDate: string; endDate: string } }[] }, today: string) {
  if (!presentation.editions.length) return;
  if (presentation.editions.some(({ edition }) => today >= edition.startDate && today <= edition.endDate)) return;
  throw new BadRequestException(`"${presentation.name}" es de una edición especial que está cerrada.`);
}

function orderFields(dto: CreateOrderDto) {
  return {
    customer: dto.customer.trim(),
    phone: dto.phone?.trim() || null,
    address: dto.delivery === 'DELIVERY' ? dto.address?.trim() : null,
    delivery: dto.delivery,
    payment: dto.payment,
    fee: dto.delivery === 'DELIVERY' ? dto.fee : 0,
  };
}
