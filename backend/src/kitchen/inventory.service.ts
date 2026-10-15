import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { KitchenSnapshotService } from './kitchen-snapshot.service';
import { assertSupplier, assertSupplies, own } from './ownership';
import { averageCostAfterPurchase, toIsoDate } from './kitchen-rules';
import { CreatePurchaseDto, SupplierDto, SupplyDto } from './dto/kitchen.dto';

// Proveedores, insumos y compras de la empresa de la sesión.
// Un empaque (caja, bolsa, sticker) siempre se cuenta por unidad.
function assertPackagingByUnit(dto: SupplyDto) {
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
    await this.prisma.supply.create({ data: { organizationId, ...dto, supplierId: dto.supplierId || null } });
    return this.snapshot.load(organizationId);
  }

  async updateSupply(organizationId: string, id: string, dto: SupplyDto) {
    const supply = await own(this.prisma.supply.findUnique({ where: { id } }), organizationId, 'Insumo no encontrado.');
    assertPackagingByUnit(dto);
    if (dto.supplierId) await assertSupplier(this.prisma, organizationId, dto.supplierId);
    if (dto.kind !== supply.kind && (await this.supplyInUse(id))) {
      throw new BadRequestException('No se puede cambiar cómo se mide: este insumo ya está en recetas, productos, empaques o compras.');
    }
    await this.prisma.supply.update({ where: { id }, data: { ...dto, supplierId: dto.supplierId || null } });
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
    if (dto.date > toIsoDate(new Date())) {
      throw new BadRequestException('La fecha de la compra no puede ser futura.');
    }

    await this.prisma.$transaction(async (tx) => {
      await assertSupplier(tx, organizationId, dto.supplierId);
      const supplies = await assertSupplies(tx, organizationId, dto.lines.map((l) => l.supplyId));

      for (const line of dto.lines) {
        const supply = supplies.find((s) => s.id === line.supplyId)!;
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
