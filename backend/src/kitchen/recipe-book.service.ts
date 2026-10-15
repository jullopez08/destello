import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { KitchenSnapshotService } from './kitchen-snapshot.service';
import { assertSupplies, own } from './ownership';
import { addDays, consumedAmount, toIsoDate } from './kitchen-rules';
import { CreateLotDto, PresentationDto, ProductDto, RecipeDto } from './dto/kitchen.dto';

// Recetas, lotes de masa, productos y cajas de la empresa de la sesión.
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
    await own(this.prisma.presentation.findUnique({ where: { id } }), organizationId, 'Presentación no encontrada.');
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
    await own(this.prisma.recipe.findUnique({ where: { id: dto.recipeId } }), organizationId, 'Receta no encontrada.');
    await assertSupplies(this.prisma, organizationId, (dto.extras ?? []).map((e) => e.supplyId));
  }

  private async assertPresentation(organizationId: string, dto: PresentationDto) {
    const productIds = [...new Set(dto.items.map((i) => i.productId))];
    const found = await this.prisma.product.count({ where: { organizationId, id: { in: productIds } } });
    if (found !== productIds.length) throw new BadRequestException('Algún producto no existe.');
    await assertSupplies(this.prisma, organizationId, dto.pack.map((p) => p.supplyId));
  }
}
