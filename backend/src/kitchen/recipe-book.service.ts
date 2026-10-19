import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { KitchenSnapshotService } from './kitchen-snapshot.service';
import { assertSupplies, own } from './ownership';
import { addDays, consumedAmount, recipeCostPerGram, toIsoDate } from './kitchen-rules';
import { CreateLotDto, ProductDto, RecipeDto } from './dto/kitchen.dto';
import { consumeSupply, usableStock } from './supply-batches';

// Recetas, lotes de masa y productos de la empresa de la sesión
// (lo que se vende está en PresentationsService).
@Injectable()
export class RecipeBookService {

  constructor(
    private readonly prisma: PrismaService,
    private readonly snapshot: KitchenSnapshotService,
  ) {}

  // ── Recetas ──

  async createRecipe(organizationId: string, dto: RecipeDto) {
    await assertSupplies(this.prisma, organizationId, dto.items.map((i) => i.supplyId));
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
    await own(this.prisma.recipe.findUnique({ where: { id } }), organizationId, 'Receta no encontrada.');
    await assertSupplies(this.prisma, organizationId, dto.items.map((i) => i.supplyId));
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
      const recipe = await own(
        tx.recipe.findUnique({ where: { id: dto.recipeId }, include: { items: { include: { supply: { include: { batches: true } } } } } }),
        organizationId,
        'Receta no encontrada.',
      );

      // Lo vencido no cuenta: si solo queda vencido, no alcanza.
      const today = toIsoDate(new Date());
      const short = recipe.items.filter((i) => consumedAmount(i.supply.kind, i.qty * dto.batches) > usableStock(i.supply.stock, i.supply.batches, today) + 1e-9);
      if (short.length) {
        throw new BadRequestException(`No alcanza: ${short.map((i) => i.supply.name).join(', ')}. Si tienes pero está vencido, bótalo en Insumos.`);
      }

      for (const item of recipe.items) {
        await consumeSupply(tx, item.supplyId, consumedAmount(item.supply.kind, item.qty * dto.batches), today);
      }

      const grams = recipe.yieldGrams * dto.batches;
      await tx.doughLot.create({
        data: { organizationId, recipeId: recipe.id, grams, left: grams, madeOn: today, expiresOn: addDays(today, dto.days) },
      });
    });
    return this.snapshot.load(organizationId);
  }

  // Botar masa (vencida o dañada): sale de la masa guardada y queda como pérdida
  // en Analítica, con lo que costó según el costo de hoy de los insumos.
  async discardLot(organizationId: string, id: string) {
    await this.prisma.$transaction(async (tx) => {
      const lot = await own(tx.doughLot.findUnique({ where: { id }, include: { recipe: { include: { items: true } } } }), organizationId, 'Masa no encontrada.');
      const supplies = await tx.supply.findMany({ where: { organizationId } });
      const cost = Math.round(recipeCostPerGram(lot.recipe, supplies) * lot.left);
      await tx.doughWaste.create({
        data: { organizationId, recipeId: lot.recipeId, grams: lot.left, cost, date: toIsoDate(new Date()), expiresOn: lot.expiresOn },
      });
      await tx.doughLot.delete({ where: { id } });
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
        extras: { create: extraRows(dto) },
      },
    });
    return this.snapshot.load(organizationId);
  }

  async updateProduct(organizationId: string, id: string, dto: ProductDto) {
    await own(this.prisma.product.findUnique({ where: { id } }), organizationId, 'Producto no encontrado.');
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
          extras: { create: extraRows(dto) },
        },
      }),
    ]);
    return this.snapshot.load(organizationId);
  }

  // ── Ayudas ──

  private async assertProduct(organizationId: string, dto: ProductDto) {
    await own(this.prisma.recipe.findUnique({ where: { id: dto.recipeId } }), organizationId, 'Receta no encontrada.');
    const extras = dto.extras ?? [];
    if (extras.some((e) => !e.supplyId === !e.recipeId)) throw new BadRequestException('Cada extra es un insumo o una receta.');
    await assertSupplies(this.prisma, organizationId, extras.flatMap((e) => (e.supplyId ? [e.supplyId] : [])));
    const recipeIds = [...new Set(extras.flatMap((e) => (e.recipeId ? [e.recipeId] : [])))];
    if (recipeIds.includes(dto.recipeId)) throw new BadRequestException('El relleno no puede ser la misma masa del producto.');
    const found = await this.prisma.recipe.count({ where: { organizationId, id: { in: recipeIds } } });
    if (found !== recipeIds.length) throw new BadRequestException('Alguna receta no existe.');
  }
}

// Extras como se guardan: insumo o receta, uno de los dos.
function extraRows(dto: ProductDto) {
  return (dto.extras ?? []).map(({ supplyId, recipeId, qty }) => ({ supplyId: supplyId || null, recipeId: supplyId ? null : recipeId || null, qty }));
}
