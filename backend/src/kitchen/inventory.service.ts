import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { KitchenSnapshotService } from './kitchen-snapshot.service';
import { addDays, averageCostAfterPurchase, consumedAmount, toIsoDate } from './kitchen-rules';
import {
  CreateLotDto,
  CreatePurchaseDto,
  PresentationDto,
  ProductDto,
  RecipeDto,
  SupplierDto,
  SupplyDto,
} from './dto/kitchen.dto';

type Tx = Prisma.TransactionClient;

@Injectable()
export class InventoryService {

  constructor(
    private readonly prisma: PrismaService,
    private readonly snapshot: KitchenSnapshotService,
  ) {}

  // ── Proveedores ──

  async createSupplier(organizationId: string, dto: SupplierDto) {
    await this.prisma.$transaction(async (tx) => {
      await this.assertSupplies(tx, organizationId, dto.supplyIds);
      const { supplyIds, ...data } = dto;
      const supplier = await tx.supplier.create({ data: { organizationId, ...this.cleanSupplier(data) } });
      await tx.supply.updateMany({ where: { id: { in: supplyIds }, organizationId }, data: { supplierId: supplier.id } });
    });
    return this.snapshot.load(organizationId);
  }

  async updateSupplier(organizationId: string, id: string, dto: SupplierDto) {
    await this.prisma.$transaction(async (tx) => {
      await this.own(tx.supplier.findUnique({ where: { id } }), organizationId, 'Proveedor no encontrado.');
      await this.assertSupplies(tx, organizationId, dto.supplyIds);
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
    await this.own(this.prisma.supplier.findUnique({ where: { id } }), organizationId, 'Proveedor no encontrado.');
    await this.prisma.supplier.delete({ where: { id } });
    return this.snapshot.load(organizationId);
  }

  // ── Insumos ──

  async createSupply(organizationId: string, dto: SupplyDto) {
    if (dto.supplierId) await this.assertSupplier(this.prisma, organizationId, dto.supplierId);
    await this.prisma.supply.create({ data: { organizationId, ...dto, supplierId: dto.supplierId || null } });
    return this.snapshot.load(organizationId);
  }

  async updateSupply(organizationId: string, id: string, dto: SupplyDto) {
    const supply = await this.own(this.prisma.supply.findUnique({ where: { id } }), organizationId, 'Insumo no encontrado.');
    if (dto.supplierId) await this.assertSupplier(this.prisma, organizationId, dto.supplierId);
    if (dto.kind !== supply.kind && (await this.supplyInUse(id))) {
      throw new BadRequestException('No se puede cambiar cómo se mide: este insumo ya está en recetas, productos, empaques o compras.');
    }
    await this.prisma.supply.update({ where: { id }, data: { ...dto, supplierId: dto.supplierId || null } });
    return this.snapshot.load(organizationId);
  }

  async removeSupply(organizationId: string, id: string) {
    await this.own(this.prisma.supply.findUnique({ where: { id } }), organizationId, 'Insumo no encontrado.');
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
      await this.assertSupplier(tx, organizationId, dto.supplierId);
      const supplies = await this.assertSupplies(tx, organizationId, dto.lines.map((l) => l.supplyId));

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

  // ── Recetas ──

  async createRecipe(organizationId: string, dto: RecipeDto) {
    await this.assertSupplies(this.prisma, organizationId, dto.items.map((i) => i.supplyId));
    await this.prisma.recipe.create({
      data: {
        organizationId,
        name: dto.name,
        yieldGrams: dto.yieldGrams,
        color: dto.color,
        items: { create: dto.items.map(({ supplyId, qty }) => ({ supplyId, qty })) },
      },
    });
    return this.snapshot.load(organizationId);
  }

  async updateRecipe(organizationId: string, id: string, dto: RecipeDto) {
    await this.own(this.prisma.recipe.findUnique({ where: { id } }), organizationId, 'Receta no encontrada.');
    await this.assertSupplies(this.prisma, organizationId, dto.items.map((i) => i.supplyId));
    await this.prisma.$transaction([
      this.prisma.recipeItem.deleteMany({ where: { recipeId: id } }),
      this.prisma.recipe.update({
        where: { id },
        data: {
          name: dto.name,
          yieldGrams: dto.yieldGrams,
          color: dto.color,
          items: { create: dto.items.map(({ supplyId, qty }) => ({ supplyId, qty })) },
        },
      }),
    ]);
    return this.snapshot.load(organizationId);
  }

  // Producir un lote de masa: descuenta los insumos y guarda la masa.
  async createLot(organizationId: string, dto: CreateLotDto) {
    await this.prisma.$transaction(async (tx) => {
      const recipe = await this.own(
        tx.recipe.findUnique({ where: { id: dto.recipeId }, include: { items: { include: { supply: true } } } }),
        organizationId,
        'Receta no encontrada.',
      );

      const short = recipe.items.filter((i) => consumedAmount(i.supply.kind, i.qty * dto.batches) > i.supply.stock + 1e-9);
      if (short.length) {
        throw new BadRequestException(`No alcanza: ${short.map((i) => i.supply.name).join(', ')}.`);
      }

      for (const item of recipe.items) {
        await tx.supply.update({
          where: { id: item.supplyId },
          data: { stock: { decrement: consumedAmount(item.supply.kind, item.qty * dto.batches) } },
        });
      }

      const today = toIsoDate(new Date());
      const grams = recipe.yieldGrams * dto.batches;
      await tx.doughLot.create({
        data: { organizationId, recipeId: recipe.id, grams, left: grams, madeOn: today, expiresOn: addDays(today, dto.days) },
      });
    });
    return this.snapshot.load(organizationId);
  }

  // ── Productos ──

  async createProduct(organizationId: string, dto: ProductDto) {
    await this.assertProduct(organizationId, dto);
    await this.prisma.product.create({
      data: {
        organizationId,
        name: dto.name,
        mode: dto.mode,
        recipeId: dto.recipeId,
        grams: dto.grams,
        look: dto.look,
        extras: { create: (dto.extras ?? []).map(({ supplyId, qty }) => ({ supplyId, qty })) },
      },
    });
    return this.snapshot.load(organizationId);
  }

  async updateProduct(organizationId: string, id: string, dto: ProductDto) {
    await this.own(this.prisma.product.findUnique({ where: { id } }), organizationId, 'Producto no encontrado.');
    await this.assertProduct(organizationId, dto);
    await this.prisma.$transaction([
      this.prisma.productExtra.deleteMany({ where: { productId: id } }),
      this.prisma.product.update({
        where: { id },
        data: {
          name: dto.name,
          mode: dto.mode,
          recipeId: dto.recipeId,
          grams: dto.grams,
          look: dto.look,
          extras: { create: (dto.extras ?? []).map(({ supplyId, qty }) => ({ supplyId, qty })) },
        },
      }),
    ]);
    return this.snapshot.load(organizationId);
  }

  // ── Cajas y presentaciones (lo que se vende) ──

  async createPresentation(organizationId: string, dto: PresentationDto) {
    await this.assertPresentation(organizationId, dto);
    await this.prisma.presentation.create({ data: { organizationId, ...this.presentationData(dto) } });
    return this.snapshot.load(organizationId);
  }

  async updatePresentation(organizationId: string, id: string, dto: PresentationDto) {
    await this.own(this.prisma.presentation.findUnique({ where: { id } }), organizationId, 'Presentación no encontrada.');
    await this.assertPresentation(organizationId, dto);
    await this.prisma.$transaction([
      this.prisma.presentationItem.deleteMany({ where: { presentationId: id } }),
      this.prisma.presentationPack.deleteMany({ where: { presentationId: id } }),
      this.prisma.presentation.update({ where: { id }, data: this.presentationData(dto) }),
    ]);
    return this.snapshot.load(organizationId);
  }

  // ── Ayudas ──

  private presentationData(dto: PresentationDto) {
    return {
      name: dto.name,
      price: dto.price,
      active: dto.active,
      items: { create: dto.items.map(({ productId, units }) => ({ productId, units })) },
      pack: { create: dto.pack.map(({ supplyId, qty }) => ({ supplyId, qty })) },
    };
  }

  private async assertProduct(organizationId: string, dto: ProductDto) {
    await this.own(this.prisma.recipe.findUnique({ where: { id: dto.recipeId } }), organizationId, 'Receta no encontrada.');
    await this.assertSupplies(this.prisma, organizationId, (dto.extras ?? []).map((e) => e.supplyId));
  }

  private async assertPresentation(organizationId: string, dto: PresentationDto) {
    const productIds = [...new Set(dto.items.map((i) => i.productId))];
    const found = await this.prisma.product.count({ where: { organizationId, id: { in: productIds } } });
    if (found !== productIds.length) throw new BadRequestException('Algún producto no existe.');
    await this.assertSupplies(this.prisma, organizationId, dto.pack.map((p) => p.supplyId));
  }

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

  private async assertSupplier(db: PrismaService | Tx, organizationId: string, supplierId: string) {
    await this.own(db.supplier.findUnique({ where: { id: supplierId } }), organizationId, 'Proveedor no encontrado.');
  }

  // Todos los insumos deben existir y ser de esta empresa.
  private async assertSupplies(db: PrismaService | Tx, organizationId: string, ids: string[]) {
    const unique = [...new Set(ids)];
    if (!unique.length) return [];
    const supplies = await db.supply.findMany({ where: { organizationId, id: { in: unique } } });
    if (supplies.length !== unique.length) throw new BadRequestException('Algún insumo no existe.');
    return supplies;
  }

  private async own<T extends { organizationId: string }>(query: Promise<T | null>, organizationId: string, message: string): Promise<T> {
    const record = await query;
    if (!record || record.organizationId !== organizationId) throw new NotFoundException(message);
    return record;
  }
}
