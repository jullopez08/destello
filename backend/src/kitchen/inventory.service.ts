import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { KitchenSnapshotService } from './kitchen-snapshot.service';
import { assertSupplier, assertSupplies, own } from './ownership';
import { averageCostAfterPurchase, toIsoDate } from './kitchen-rules';
import { CreatePurchaseDto, SupplierDto, SupplyDto, SupplyPerishableDto } from './dto/kitchen.dto';
import { applyTakes, perishableByDefault, trimBatches } from './supply-batches';

// Proveedores, insumos y compras de la empresa de la sesión.
// Un empaque (caja, bolsa, sticker) siempre se cuenta por unidad. Un ingrediente
// puede ir por peso, volumen o unidad (los huevos se compran y se usan por unidad).
export function assertPackagingByUnit(dto: Pick<SupplyDto, 'category' | 'kind'>) {
  if (dto.category === 'PACKAGING' && dto.kind !== 'UNIT') {
    throw new BadRequestException('Un empaque se cuenta por unidad.');
  }
}

@Injectable()
export class InventoryService {

  constructor(
    private readonly prisma: PrismaService,
    private readonly snapshot: KitchenSnapshotService,
  ) {}

  // ── Proveedores ──

  async createSupplier(organizationId: string, dto: SupplierDto) {
    await this.prisma.$transaction(async (tx) => {
      await assertSupplies(tx, organizationId, dto.supplyIds);
      const { supplyIds, ...data } = dto;
      const supplier = await tx.supplier.create({ data: { organizationId, ...this.cleanSupplier(data) } });
      await tx.supply.updateMany({ where: { id: { in: supplyIds }, organizationId }, data: { supplierId: supplier.id } });
    });
    return this.snapshot.load(organizationId);
  }

  async updateSupplier(organizationId: string, id: string, dto: SupplierDto) {
    await this.prisma.$transaction(async (tx) => {
      await own(tx.supplier.findUnique({ where: { id } }), organizationId, 'Proveedor no encontrado.');
      await assertSupplies(tx, organizationId, dto.supplyIds);
      const { supplyIds, ...data } = dto;
      await tx.supplier.update({ where: { id }, data: this.cleanSupplier(data) });
      // Los insumos marcados pasan a este proveedor; los que se desmarcaron quedan sin proveedor.
      await tx.supply.updateMany({ where: { organizationId, supplierId: id, id: { notIn: supplyIds } }, data: { supplierId: null } });
      await tx.supply.updateMany({ where: { organizationId, id: { in: supplyIds } }, data: { supplierId: id } });
    });
    return this.snapshot.load(organizationId);
  }

  // Sus insumos quedan sin proveedor y las compras se conservan.
  async removeSupplier(organizationId: string, id: string) {
    await own(this.prisma.supplier.findUnique({ where: { id } }), organizationId, 'Proveedor no encontrado.');
    await this.prisma.supplier.delete({ where: { id } });
    return this.snapshot.load(organizationId);
  }

  // ── Insumos ──

  async createSupply(organizationId: string, dto: SupplyDto) {
    assertPackagingByUnit(dto);
    if (dto.supplierId) await assertSupplier(this.prisma, organizationId, dto.supplierId);
    const { expiresOn, ...rest } = dto;
    // Si no se dice, se propone según el nombre (casi todo ingrediente vence).
    const data = { ...rest, perishable: rest.perishable ?? perishableByDefault(rest.name, rest.category) };
    const today = toIsoDate(new Date());
    if (data.perishable && expiresOn && expiresOn < today) throw new BadRequestException('Esa fecha ya pasó: lo que tienes está vencido.');
    await this.prisma.supply.create({
      data: {
        organizationId,
        ...data,
        supplierId: data.supplierId || null,
        // La existencia inicial de un insumo con vencimiento queda como su primer lote.
        ...(data.perishable && expiresOn && data.stock > 0
          ? { batches: { create: { organizationId, qty: data.stock, left: data.stock, expiresOn, receivedOn: today } } }
          : {}),
      },
    });
    return this.snapshot.load(organizationId);
  }

  async updateSupply(organizationId: string, id: string, dto: SupplyDto) {
    const supply = await own(this.prisma.supply.findUnique({ where: { id } }), organizationId, 'Insumo no encontrado.');
    assertPackagingByUnit(dto);
    if (dto.supplierId) await assertSupplier(this.prisma, organizationId, dto.supplierId);
    if (dto.kind !== supply.kind && (await this.supplyInUse(id))) {
      throw new BadRequestException('No se puede cambiar cómo se mide: este insumo ya está en recetas, productos, empaques o compras.');
    }
    const { expiresOn: _initial, ...data } = dto;
    await this.prisma.$transaction(async (tx) => {
      await tx.supply.update({ where: { id }, data: { ...data, supplierId: data.supplierId || null } });
      // Sin vencimiento, lo que estaba en lotes pasa a no tener fecha.
      if (data.perishable === false) await tx.supplyBatch.deleteMany({ where: { supplyId: id } });
      else await applyTakes(tx, trimBatches(await tx.supplyBatch.findMany({ where: { supplyId: id } }), data.stock));
    });
    return this.snapshot.load(organizationId);
  }

  // «Revisar vencimientos»: marca de una vez cuáles llevan fecha. Un empaque nunca;
  // al quitar la marca, lo que estaba en lotes pasa a no tener fecha.
  async setPerishable(organizationId: string, dto: SupplyPerishableDto) {
    await this.prisma.$transaction(async (tx) => {
      const supplies = await assertSupplies(tx, organizationId, dto.items.map((i) => i.supplyId));
      for (const item of dto.items) {
        const supply = supplies.find((s) => s.id === item.supplyId)!;
        const perishable = item.perishable && supply.category !== 'PACKAGING';
        await tx.supply.update({ where: { id: supply.id }, data: { perishable } });
        if (!perishable) await tx.supplyBatch.deleteMany({ where: { supplyId: supply.id } });
      }
    });
    return this.snapshot.load(organizationId);
  }

  // Botar lo que queda de un lote (vencido o dañado): baja la existencia y queda como pérdida.
  async discardBatch(organizationId: string, id: string) {
    await this.prisma.$transaction(async (tx) => {
      const batch = await own(tx.supplyBatch.findUnique({ where: { id }, include: { supply: true } }), organizationId, 'Lote no encontrado.');
      const qty = Math.min(batch.left, batch.supply.stock);
      await tx.supply.update({ where: { id: batch.supplyId }, data: { stock: { decrement: qty } } });
      await tx.supplyWaste.create({
        data: { organizationId, supplyId: batch.supplyId, qty, cost: Math.round(qty * batch.supply.cost), date: toIsoDate(new Date()) },
      });
      await tx.supplyBatch.delete({ where: { id } });
    });
    return this.snapshot.load(organizationId);
  }

  async removeSupply(organizationId: string, id: string) {
    await own(this.prisma.supply.findUnique({ where: { id } }), organizationId, 'Insumo no encontrado.');
    if (await this.supplyInUse(id)) {
      throw new ConflictException('No se puede eliminar: lo usa una receta, un producto, un empaque o una compra.');
    }
    await this.prisma.supply.delete({ where: { id } });
    return this.snapshot.load(organizationId);
  }

  // ── Compras: suben la existencia y recalculan el costo promedio ──

  async createPurchase(organizationId: string, dto: CreatePurchaseDto) {
    const today = toIsoDate(new Date());
    if (dto.date > today) {
      throw new BadRequestException('La fecha de la compra no puede ser futura.');
    }

    await this.prisma.$transaction(async (tx) => {
      await assertSupplier(tx, organizationId, dto.supplierId);
      const supplies = await assertSupplies(tx, organizationId, dto.lines.map((l) => l.supplyId));

      for (const line of dto.lines) {
        const supply = supplies.find((s) => s.id === line.supplyId)!;
        if (supply.perishable) {
          if (!line.expiresOn) throw new BadRequestException(`Escribe cuándo vence ${supply.name}.`);
          if (line.expiresOn < today) throw new BadRequestException(`${supply.name}: esa fecha ya pasó, está vencido.`);
          await tx.supplyBatch.create({
            data: { organizationId, supplyId: supply.id, qty: line.qty, left: line.qty, expiresOn: line.expiresOn, receivedOn: dto.date },
          });
        }
        const cost = averageCostAfterPurchase(supply.stock, supply.cost, line.qty, line.total);
        supply.stock += line.qty;
        supply.cost = cost;
        await tx.supply.update({
          where: { id: supply.id },
          data: { stock: supply.stock, cost, ...(supply.supplierId ? {} : { supplierId: dto.supplierId }) },
        });
      }

      await tx.purchase.create({
        data: {
          organizationId,
          supplierId: dto.supplierId,
          date: dto.date,
          lines: { create: dto.lines.map(({ supplyId, qty, total }) => ({ supplyId, qty, total })) },
        },
      });
    });
    return this.snapshot.load(organizationId);
  }

  // ── Ayudas ──

  private cleanSupplier(data: Omit<SupplierDto, 'supplyIds'>) {
    const blank = (v?: string) => (v?.trim() ? v.trim() : null);
    return {
      name: data.name.trim(),
      contact: blank(data.contact),
      phone: blank(data.phone),
      email: blank(data.email),
      address: blank(data.address),
      notes: blank(data.notes),
      color: data.color,
    };
  }

  private async supplyInUse(id: string) {
    const [recipes, extras, packs, purchases] = await Promise.all([
      this.prisma.recipeItem.count({ where: { supplyId: id } }),
      this.prisma.productExtra.count({ where: { supplyId: id } }),
      this.prisma.presentationPack.count({ where: { supplyId: id } }),
      this.prisma.purchaseLine.count({ where: { supplyId: id } }),
    ]);
    return recipes + extras + packs + purchases > 0;
  }
}
