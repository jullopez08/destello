import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { KitchenSnapshotService } from './kitchen-snapshot.service';
import { productionDateFor, toIsoDate } from './kitchen-rules';
import { orderDateProblem } from './kitchen-dates';
import { produce } from './produce';
import { CreateEditionDto, CreateOrderDto } from './dto/kitchen.dto';
import { buildOrderLines, lineKey } from './order-lines';

@Injectable()
export class OrdersService {

  constructor(
    private readonly prisma: PrismaService,
    private readonly snapshot: KitchenSnapshotService,
  ) {}

  // El pedido se produce el día que escoja la dueña o, sin escoger, el que toca según la hora de corte y los días
  // sin producción. Guarda el precio de cada línea tal como estaba al pedirla.
  async createOrder(organizationId: string, dto: CreateOrderDto) {
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.findUniqueOrThrow({ where: { id: organizationId } });
      const earliest = productionDateFor(now, org.orderCutoff, org.closedDays);
      const productionDate = dto.productionDate ?? earliest;
      const problem = orderDateProblem(productionDate, earliest, toIsoDate(now), org.closedDays);
      if (problem) throw new BadRequestException(problem);
      const lines = await this.orderLines(tx, organizationId, dto, productionDate);
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
          productionDate,
          lines: { create: lines },
        },
      });
    });
    return this.snapshot.load(organizationId);
  }

  // Editar (Julieth, 2026-10-21: el cliente cambia de idea o se escribió mal). Solo antes de producirlo, como
  // cancelar: después ya se gastó la masa. Sigue con su número; lo que ya estaba conserva su precio aunque hoy esté
  // pausado o la edición cerrada. El día se puede cambiar (2026-10-22); uno atrasado tiene que pasar a otro.
  async updateOrder(organizationId: string, id: string, dto: CreateOrderDto) {
    const order = await this.ownOrder(id, organizationId);
    const now = new Date();
    const today = toIsoDate(now);
    const day = dto.productionDate ?? order.productionDate;
    if (day !== order.productionDate || day < today) {
      const org = await this.prisma.organization.findUniqueOrThrow({ where: { id: organizationId } });
      const problem = orderDateProblem(day, productionDateFor(now, org.orderCutoff, org.closedDays), today, org.closedDays);
      if (problem) throw new BadRequestException(problem);
    }
    await this.prisma.$transaction(async (tx) => {
      const before = await tx.orderLine.findMany({ where: { orderId: id } });
      const lines = await this.orderLines(tx, organizationId, dto, day, before);
      const kept = new Map(before.map((l) => [lineKey(l), l.unitPrice]));
      // Con la condición en el mismo cambio: si justo se registró la producción, no se toca.
      const { count } = await tx.order.updateMany({
        where: { id, organizationId, status: OrderStatus.PENDING, produced: false },
        // Otra forma de pago: hay que volver a recibirlo.
        data: { ...orderFields(dto), productionDate: day, ...(dto.payment !== order.payment && { paidAt: null }) },
      });
      if (!count) throw new BadRequestException('Solo se editan pedidos que aún no se han producido.');
      await tx.orderLine.deleteMany({ where: { orderId: id } });
      await tx.orderLine.createMany({
        data: lines.map((l) => ({ ...l, orderId: id, unitPrice: kept.get(lineKey(l)) ?? l.unitPrice })),
      });
    });
    return this.snapshot.load(organizationId);
  }

  // Lo que se vende, de esta empresa, a la venta y con su edición abierta el día del pedido (`day`, 2026-10-22:
  // un pedido de noviembre para el 5 de diciembre puede llevar lo de Navidad). `before`: lo que ya tenía el pedido.
  private async orderLines(tx: Prisma.TransactionClient, organizationId: string, dto: CreateOrderDto, day: string, before: { presentationId: string }[] = []) {
    const ids = [...new Set(dto.lines.map((l) => l.presentationId))];
    const presentations = await tx.presentation.findMany({
      where: { organizationId, id: { in: ids } },
      include: { items: true, sizes: true, editions: { include: { edition: true } } },
    });
    if (presentations.length !== ids.length) throw new BadRequestException('Algún producto no existe.');
    for (const p of presentations) {
      if (before.some((l) => l.presentationId === p.id)) continue;
      if (!p.active) throw new BadRequestException(`"${p.name}" está pausada y no se puede vender.`);
      assertEditionOpen(p, day);
    }
    const packaging = await tx.supply.findMany({ where: { organizationId, category: 'PACKAGING' }, select: { id: true } });
    return buildOrderLines(dto.lines, presentations, new Set(packaging.map((x) => x.id)));
  }

  // Sale con un repartidor. El cliente solo recibe el aviso de que va en camino. En efectivo, el repartidor le paga
  // el pedido al negocio al recogerlo: queda pagado.
  async sendOrder(organizationId: string, id: string, courierId: string) {
    const order = await this.ownOrder(id, organizationId);
    if (order.status !== OrderStatus.PENDING || !order.produced) {
      throw new BadRequestException('Solo se envían pedidos ya producidos.');
    }
    const courier = await this.prisma.courier.findUnique({ where: { id: courierId } });
    if (!courier || courier.organizationId !== organizationId) throw new NotFoundException('Repartidor no encontrado.');

    await this.prisma.order.update({ where: { id }, data: { status: OrderStatus.ON_THE_WAY, courierId, ...cashPaid(order) } });
    return this.snapshot.load(organizationId);
  }

  // En camino → entregado. Un pedido que recogen en la cocina se entrega
  // directo, apenas está producido (y si es en efectivo, ahí paga).
  async deliverOrder(organizationId: string, id: string) {
    const order = await this.ownOrder(id, organizationId);
    const pickupReady = order.status === OrderStatus.PENDING && order.produced && order.delivery === 'PICKUP';
    if (order.status !== OrderStatus.ON_THE_WAY && !pickupReady) {
      throw new BadRequestException('Este pedido todavía no se puede marcar como entregado.');
    }
    await this.prisma.order.update({ where: { id }, data: { status: OrderStatus.DELIVERED, deliveredAt: new Date(), ...cashPaid(order) } });
    return this.snapshot.load(organizationId);
  }

  // "Ya se entregó" (Julieth, 2026-10-22): un pedido atrasado que sí se hizo y salió sin registrarlo. Descuenta lo
  // que lleva sin bloquear (ya se hizo) y queda entregado. Sin `deliveredAt`: ese efectivo no es del cajón de hoy.
  async deliveredLate(organizationId: string, id: string) {
    const order = await this.ownOrder(id, organizationId);
    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.order.updateMany({
        where: { id, organizationId, status: OrderStatus.PENDING, produced: false, productionDate: { lt: toIsoDate(new Date()) } },
        data: { produced: true, status: OrderStatus.DELIVERED, ...cashPaid(order) },
      });
      if (!count) throw new BadRequestException('Solo se marca así un pedido atrasado.');
      const lines = await tx.orderLine.findMany({ where: { orderId: id } });
      await produce(tx, organizationId, lines, await this.snapshot.ruleData(organizationId, tx), false);
    });
    return this.snapshot.load(organizationId);
  }

  // "Pago recibido" (Julieth, 2026-10-22): la dueña revisó que la transferencia llegó (o le pagaron antes).
  async markPaid(organizationId: string, id: string) {
    await this.ownOrder(id, organizationId);
    const { count } = await this.prisma.order.updateMany({
      where: { id, organizationId, paidAt: null, status: { not: OrderStatus.CANCELLED } },
      data: { paidAt: new Date() },
    });
    if (!count) throw new BadRequestException('Este pedido ya está pagado o cancelado.');
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

// Lo de una edición especial solo se vende para un día entre las fechas de alguna
// de sus ediciones. Ya no hay cupo: la cantidad la decide lo que se produzca.
function assertEditionOpen(presentation: { name: string; editions: { edition: { startDate: string; endDate: string } }[] }, day: string) {
  if (!presentation.editions.length) return;
  if (presentation.editions.some(({ edition }) => day >= edition.startDate && day <= edition.endDate)) return;
  throw new BadRequestException(`"${presentation.name}" es de una edición especial que no está abierta ese día.`);
}

// El efectivo se recibe al entregarlo o al dárselo al repartidor.
const cashPaid = (o: { payment: string; paidAt: Date | null }) => (o.payment === 'CASH' && !o.paidAt ? { paidAt: new Date() } : {});

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
