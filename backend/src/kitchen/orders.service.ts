import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { KitchenSnapshotService } from './kitchen-snapshot.service';
import { consumedAmount, productionDateFor, productionPlan, toIsoDate } from './kitchen-rules';
import { CreateEditionDto, CreateOrderDto } from './dto/kitchen.dto';
import { buildOrderLines } from './order-lines';

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
    const today = toIsoDate(now);

    await this.prisma.$transaction(async (tx) => {
      const ids = [...new Set(dto.lines.map((l) => l.presentationId))];
      const presentations = await tx.presentation.findMany({
        where: { organizationId, id: { in: ids } },
        include: { items: true, sizes: true, editions: { include: { edition: true } } },
      });
      if (presentations.length !== ids.length) throw new BadRequestException('Algún producto no existe.');

      for (const p of presentations) {
        if (!p.active) throw new BadRequestException(`"${p.name}" está pausada y no se puede vender.`);
        await this.assertEditionOpen(tx, organizationId, p, dto.lines, today);
      }

      const packaging = await tx.supply.findMany({ where: { organizationId, category: 'PACKAGING' }, select: { id: true } });
      const lines = buildOrderLines(dto.lines, presentations, new Set(packaging.map((x) => x.id)));

      const organization = await tx.organization.update({
        where: { id: organizationId },
        data: { nextOrderNumber: { increment: 1 } },
      });

      await tx.order.create({
        data: {
          organizationId,
          number: organization.nextOrderNumber - 1,
          customer: dto.customer.trim(),
          phone: dto.phone?.trim() || null,
          address: dto.delivery === 'DELIVERY' ? dto.address?.trim() : null,
          orderedOn: today,
          productionDate: productionDateFor(now, organization.orderCutoff, organization.closedDays),
          delivery: dto.delivery,
          payment: dto.payment,
          fee: dto.delivery === 'DELIVERY' ? dto.fee : 0,
          lines: { create: lines },
        },
      });
    });
    return this.snapshot.load(organizationId);
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
    await this.prisma.order.update({ where: { id }, data: { status: OrderStatus.DELIVERED } });
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
      const plan = productionPlan(pending.flatMap((o) => o.lines), data);

      if (plan.shortages.length) {
        const names = plan.shortages.map((s) => data.supplies.find((x) => x.id === s.supplyId)!.name);
        throw new BadRequestException(`Faltan insumos: ${names.join(', ')}. Registra una compra antes de producir.`);
      }

      for (const row of plan.doughRows) {
        let take = row.fromLots;
        for (const lot of data.lots.filter((l) => l.recipeId === row.recipeId)) {
          if (take <= 0) break;
          const used = Math.min(lot.left, take);
          take -= used;
          await tx.doughLot.update({ where: { id: lot.id }, data: { left: { decrement: used } } });
        }
      }

      for (const need of plan.supplies) {
        const supply = data.supplies.find((s) => s.id === need.supplyId)!;
        const used = Math.min(supply.stock, consumedAmount(supply.kind, need.need));
        await tx.supply.update({ where: { id: supply.id }, data: { stock: { decrement: used } } });
      }

      await tx.doughLot.deleteMany({ where: { organizationId, left: { lte: 0.5 } } });
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
        cap: dto.cap,
        look: dto.look,
        color: dto.color,
        presentations: { create: ids.map((presentationId) => ({ presentationId })) },
      },
    });
    return this.snapshot.load(organizationId);
  }

  // Las presentaciones siguen existiendo.
  async removeEdition(organizationId: string, id: string) {
    const { count } = await this.prisma.edition.deleteMany({ where: { id, organizationId } });
    if (!count) throw new NotFoundException('Edición no encontrada.');
    return this.snapshot.load(organizationId);
  }

  // Una caja que pertenece a ediciones solo se vende mientras alguna esté
  // abierta: entre sus fechas y sin completar el cupo.
  private async assertEditionOpen(
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
    organizationId: string,
    presentation: { id: string; name: string; editions: { edition: { id: string; name: string; startDate: string; endDate: string; cap: number } }[] },
    lines: CreateOrderDto['lines'],
    today: string,
  ) {
    if (!presentation.editions.length) return;

    for (const { edition } of presentation.editions) {
      if (today < edition.startDate || today > edition.endDate) continue;
      if (!edition.cap) return;
      const sold = await this.editionSold(tx, organizationId, edition);
      const adding = lines.filter((l) => l.presentationId === presentation.id).reduce((s, l) => s + l.qty, 0);
      if (sold + adding <= edition.cap) return;
    }

    throw new BadRequestException(`"${presentation.name}" es de una edición especial que está cerrada o sin cupo.`);
  }

  private async editionSold(
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
    organizationId: string,
    edition: { id: string; startDate: string; endDate: string },
  ) {
    const links = await tx.editionPresentation.findMany({ where: { editionId: edition.id } });
    const result = await tx.orderLine.aggregate({
      _sum: { qty: true },
      where: {
        presentationId: { in: links.map((l) => l.presentationId) },
        order: { organizationId, status: { not: OrderStatus.CANCELLED }, orderedOn: { gte: edition.startDate, lte: edition.endDate } },
      },
    });
    return result._sum.qty ?? 0;
  }

  private async ownOrder(id: string, organizationId: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order || order.organizationId !== organizationId) throw new NotFoundException('Pedido no encontrado.');
    return order;
  }
}
