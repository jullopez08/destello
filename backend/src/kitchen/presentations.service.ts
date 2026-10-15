import { BadRequestException, Injectable } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { KitchenSnapshotService } from './kitchen-snapshot.service';
import { assertSupplies, own } from './ownership';
import { PresentationDto } from './dto/kitchen.dto';

// Lo que se vende, de tres formas:
// - Caja armada (BOX): lleva siempre lo mismo y su empaque.
// - Por unidad (UNIT): precio por unidad; la clienta elige sabores y cuántas.
//   El empaque de siempre va uno por pedido (en el pedido se puede cambiar).
// - Sabor y tamaño (SIZES): cada tamaño tiene precio, molde, gramos de masa y
//   empaque; cada sabor puede cobrar un recargo.
// El precio ya incluye el empaque.
@Injectable()
export class PresentationsService {

  constructor(
    private readonly prisma: PrismaService,
    private readonly snapshot: KitchenSnapshotService,
  ) {}

  async create(organizationId: string, dto: PresentationDto) {
    const data = await this.validated(organizationId, dto);
    await this.prisma.presentation.create({
      data: {
        organizationId,
        ...data.fields,
        items: { create: data.items },
        pack: { create: data.pack },
        sizes: { create: data.sizes.map((size) => ({ ...size, id: undefined })) },
      },
    });
    return this.snapshot.load(organizationId);
  }

  async update(organizationId: string, id: string, dto: PresentationDto) {
    const current = await own(
      this.prisma.presentation.findUnique({ where: { id }, include: { sizes: true } }),
      organizationId,
      'Presentación no encontrada.',
    );
    const data = await this.validated(organizationId, dto);
    const keep = new Set(data.sizes.map((s) => s.id).filter((x): x is string => !!x));
    if ([...keep].some((sizeId) => !current.sizes.some((s) => s.id === sizeId))) throw new BadRequestException('Algún tamaño no existe.');
    const removed = current.sizes.filter((s) => !keep.has(s.id)).map((s) => s.id);

    const pending = { order: { status: OrderStatus.PENDING, produced: false } };
    if (data.fields.kind !== current.kind && (await this.prisma.orderLine.count({ where: { presentationId: id, ...pending } }))) {
      throw new BadRequestException('Tiene pedidos sin producir: cambia la forma de venderla cuando salgan.');
    }
    if (removed.length && (await this.prisma.orderLine.count({ where: { sizeId: { in: removed }, ...pending } }))) {
      throw new BadRequestException('Un tamaño que quitaste tiene pedidos sin producir.');
    }

    const ops: Prisma.PrismaPromise<unknown>[] = [
      this.prisma.presentationItem.deleteMany({ where: { presentationId: id } }),
      this.prisma.presentationPack.deleteMany({ where: { presentationId: id } }),
      this.prisma.presentationSize.deleteMany({ where: { id: { in: removed } } }),
      this.prisma.presentation.update({
        where: { id },
        data: { ...data.fields, items: { create: data.items }, pack: { create: data.pack } },
      }),
    ];
    for (const { id: sizeId, ...size } of data.sizes) {
      ops.push(sizeId
        ? this.prisma.presentationSize.update({ where: { id: sizeId }, data: size })
        : this.prisma.presentationSize.create({ data: { ...size, presentationId: id } }));
    }
    await this.prisma.$transaction(ops);
    return this.snapshot.load(organizationId);
  }

  // Deja los datos como los guarda cada forma de vender y comprueba que todo
  // (productos, empaques) sea de esta empresa.
  private async validated(organizationId: string, dto: PresentationDto) {
    const kind = dto.kind ?? 'BOX';
    const productIds = [...new Set(dto.items.map((i) => i.productId))];
    const found = await this.prisma.product.count({ where: { organizationId, id: { in: productIds } } });
    if (found !== productIds.length) throw new BadRequestException('Algún producto no existe.');

    const sizes = kind === 'SIZES'
      ? (dto.sizes ?? []).map((s, position) => ({
          id: s.id,
          name: s.name.trim(),
          portions: s.portions?.trim() ?? '',
          mold: s.mold?.trim() ?? '',
          price: s.price,
          grams: s.grams,
          packSupplyId: s.packSupplyId || null,
          position,
        }))
      : [];
    if (kind === 'SIZES' && !sizes.length) throw new BadRequestException('Agrega al menos un tamaño.');
    if (kind !== 'SIZES' && !(dto.price >= 1)) throw new BadRequestException('Escribe el precio.');

    const pack = kind === 'SIZES' ? [] : dto.pack.map(({ supplyId, qty }) => ({ supplyId, qty }));
    await assertSupplies(this.prisma, organizationId, [
      ...pack.map((p) => p.supplyId),
      ...sizes.map((s) => s.packSupplyId).filter((x): x is string => !!x),
    ]);

    const flavors = kind !== 'BOX';
    const items = dto.items.map((i) => ({
      productId: i.productId,
      units: flavors ? 1 : i.units,
      surcharge: kind === 'SIZES' ? (i.surcharge ?? 0) : 0,
    }));
    if (flavors && productIds.length !== items.length) throw new BadRequestException('Hay un sabor repetido.');

    const price = kind === 'SIZES' ? Math.min(...sizes.map((s) => s.price)) : dto.price;
    return { fields: { name: dto.name.trim(), kind, price, active: dto.active }, items, pack, sizes };
  }
}
