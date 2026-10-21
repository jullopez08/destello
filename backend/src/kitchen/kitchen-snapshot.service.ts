import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CurrentUserData } from '../common/decorators/current-user.decorator';
import { addDays, KitchenRuleData, productionDateFor, toIsoDate } from './kitchen-rules';
import { usableStock } from './supply-batches';

type Db = PrismaService | Prisma.TransactionClient;

const PRESENTATION_INCLUDE = { items: true, pack: true, sizes: { orderBy: { position: 'asc' } } } satisfies Prisma.PresentationInclude;

export function requireOrganization(currentUser: CurrentUserData): string {
  if (!currentUser.organizationId) {
    throw new ForbiddenException('Esta cuenta no pertenece a ninguna empresa.');
  }
  return currentUser.organizationId;
}

// Todo lo de la cocina en una sola respuesta. Una pastelería maneja decenas de
// insumos y pedidos, no miles, así que el panel recibe el estado completo y
// calcula las vistas (producción, analítica) con las mismas reglas del backend.
// Cada cambio responde con el estado nuevo, así la pantalla nunca queda desfasada.
//
// Pedidos: los de los últimos 70 días (las 8 semanas de la analítica) más los
// pendientes o en camino de cualquier fecha.
@Injectable()
export class KitchenSnapshotService {

  constructor(private readonly prisma: PrismaService) {}

  async load(organizationId: string, db: Db = this.prisma) {
    const today = toIsoDate(new Date());
    const since = addDays(today, -70);

    const [organization, accounts, couriers, suppliers, supplies, batches, supplyWaste, purchases, recipes, lots, waste, products, presentations, orders, editions, checks] =
      await Promise.all([
        db.organization.findUnique({ where: { id: organizationId } }),
        db.bankAccount.findMany({ where: { organizationId }, orderBy: { createdAt: 'asc' } }),
        db.courier.findMany({ where: { organizationId }, orderBy: { position: 'asc' } }),
        db.supplier.findMany({ where: { organizationId }, orderBy: { name: 'asc' } }),
        db.supply.findMany({ where: { organizationId }, orderBy: { name: 'asc' } }),
        db.supplyBatch.findMany({ where: { organizationId }, orderBy: { expiresOn: 'asc' } }),
        db.supplyWaste.findMany({ where: { organizationId, date: { gte: since } }, orderBy: { date: 'desc' } }),
        db.purchase.findMany({ where: { organizationId }, include: { lines: true }, orderBy: [{ date: 'desc' }, { createdAt: 'desc' }] }),
        db.recipe.findMany({ where: { organizationId }, include: { items: true }, orderBy: { createdAt: 'asc' } }),
        db.doughLot.findMany({ where: { organizationId, left: { gt: 0.5 } }, orderBy: { expiresOn: 'asc' } }),
        db.doughWaste.findMany({ where: { organizationId, date: { gte: since } }, orderBy: { date: 'desc' } }),
        db.product.findMany({ where: { organizationId }, include: { extras: true }, orderBy: { createdAt: 'asc' } }),
        db.presentation.findMany({ where: { organizationId }, include: PRESENTATION_INCLUDE, orderBy: { createdAt: 'asc' } }),
        db.order.findMany({
          where: { organizationId, OR: [{ orderedOn: { gte: since } }, { status: { in: ['PENDING', 'ON_THE_WAY'] } }] },
          include: { lines: true },
          orderBy: { number: 'desc' },
        }),
        db.edition.findMany({ where: { organizationId }, include: { presentations: true }, orderBy: { startDate: 'asc' } }),
        db.productionCheck.findMany({ where: { organizationId, date: { gte: addDays(today, -1) } } }),
      ]);

    if (!organization) {
      throw new NotFoundException('Empresa no encontrada.');
    }

    const checkMap: Record<string, Record<string, boolean>> = {};
    for (const c of checks) {
      (checkMap[c.date] ??= {})[c.key] = c.done;
    }

    return {
      today,
      /** Día en que se produciría un pedido tomado ahora mismo */
      nextProductionDate: productionDateFor(new Date(), organization.orderCutoff, organization.closedDays),
      settings: {
        name: organization.name,
        whatsapp: organization.whatsapp,
        orderCutoff: organization.orderCutoff,
        closedDays: organization.closedDays,
        targetMargin: organization.targetMargin,
        palette: organization.palette,
        servesTables: organization.servesTables,
        kitchenNormalMin: organization.kitchenNormalMin,
        kitchenMaxMin: organization.kitchenMaxMin,
        salesTax: organization.salesTax,
        logoUrl: organization.logoUrl,
        /** false: el panel solo muestra los primeros pasos */
        setupDone: organization.setupCompletedAt !== null,
      },
      accounts: accounts.map(({ id, bank, type, number, owner }) => ({ id, bank, type, number, owner })),
      couriers: couriers.map(({ id, name, phone, position }) => ({ id, name, phone, position })),
      suppliers: suppliers.map(({ id, name, contact, phone, email, address, notes, color }) => ({ id, name, contact, phone, email, address, notes, color })),
      supplies: supplies.map(({ id, name, kind, category, stock, min, cost, pricePaid, priceQty, perishable, supplierId }) => ({ id, name, kind, category, stock, min, cost, pricePaid, priceQty, perishable, supplierId })),
      /** Lo que entró de cada insumo con vencimiento y aún queda, también lo vencido */
      supplyBatches: batches.map(({ id, supplyId, qty, left, expiresOn, receivedOn }) => ({ id, supplyId, qty, left, expiresOn, receivedOn })),
      /** Insumos botados en los últimos 70 días (Analítica) */
      supplyWaste: supplyWaste.map(({ id, supplyId, qty, cost, date }) => ({ id, supplyId, qty, cost, date })),
      purchases: purchases.map((p) => ({
        id: p.id,
        date: p.date,
        supplierId: p.supplierId,
        lines: p.lines.map(({ supplyId, qty, total }) => ({ supplyId, qty, total })),
      })),
      recipes: recipes.map((r) => ({
        id: r.id,
        name: r.name,
        yieldGrams: r.yieldGrams,
        color: r.color,
        items: r.items.map(({ supplyId, qty }) => ({ supplyId, qty })),
      })),
      lots: lots.map(({ id, recipeId, grams, left, madeOn, expiresOn }) => ({ id, recipeId, grams, left, madeOn, expiresOn })),
      /** Masa botada en los últimos 70 días (Analítica) */
      waste: waste.map(({ id, recipeId, grams, cost, date }) => ({ id, recipeId, grams, cost, date })),
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        mode: p.mode,
        recipeId: p.recipeId,
        grams: p.grams,
        look: p.look,
        extras: p.extras.map(({ supplyId, recipeId, qty }) => ({ supplyId, recipeId, qty })),
      })),
      presentations: presentations.map((p) => ({
        id: p.id,
        name: p.name,
        kind: p.kind,
        price: p.price,
        active: p.active,
        items: p.items.map(({ productId, units, surcharge }) => ({ productId, units, surcharge })),
        pack: p.pack.map(({ supplyId, qty }) => ({ supplyId, qty })),
        sizes: p.sizes.map(({ id, name, portions, mold, price, grams, packSupplyId }) => ({ id, name, portions, mold, price, grams, packSupplyId })),
      })),
      orders: orders.map((o) => ({
        id: o.id,
        number: o.number,
        customer: o.customer,
        phone: o.phone,
        address: o.address,
        orderedOn: o.orderedOn,
        productionDate: o.productionDate,
        delivery: o.delivery,
        payment: o.payment,
        fee: o.fee,
        status: o.status,
        produced: o.produced,
        courierId: o.courierId,
        lines: o.lines.map(({ orderId, presentationId, qty, unitPrice, productId, sizeId, packSupplyId }) => ({
          orderId,
          presentationId,
          qty,
          unitPrice,
          productId,
          sizeId,
          packSupplyId,
        })),
      })),
      editions: editions.map((e) => ({
        id: e.id,
        name: e.name,
        description: e.description,
        startDate: e.startDate,
        endDate: e.endDate,
        look: e.look,
        color: e.color,
        presentationIds: e.presentations.map((p) => p.presentationId),
      })),
      checks: checkMap,
    };
  }

  // Lo que necesitan las reglas (sin pedidos ni proveedores), leído dentro de
  // la misma transacción que va a descontar inventario.
  // La masa vencida no entra: no se cuenta ni se gasta (usableLots).
  async ruleData(organizationId: string, db: Db): Promise<KitchenRuleData> {
    const today = toIsoDate(new Date());
    const [supplies, recipes, lots, products, presentations] = await Promise.all([
      db.supply.findMany({ where: { organizationId }, include: { batches: true } }),
      db.recipe.findMany({ where: { organizationId }, include: { items: true } }),
      db.doughLot.findMany({ where: { organizationId, left: { gt: 0.5 }, expiresOn: { gt: today } }, orderBy: { expiresOn: 'asc' } }),
      db.product.findMany({ where: { organizationId }, include: { extras: true } }),
      db.presentation.findMany({ where: { organizationId }, include: PRESENTATION_INCLUDE }),
    ]);

    return {
      // Lo vencido no cuenta como existencia (supply-batches.ts).
      supplies: supplies.map(({ id, name, kind, stock, min, cost, batches }) => ({ id, name, kind, stock: usableStock(stock, batches, today), min, cost })),
      recipes: recipes.map((r) => ({ id: r.id, name: r.name, yieldGrams: r.yieldGrams, items: r.items })),
      lots: lots.map(({ id, recipeId, left, expiresOn }) => ({ id, recipeId, left, expiresOn })),
      products: products.map((p) => ({ id: p.id, mode: p.mode, recipeId: p.recipeId, grams: p.grams, extras: p.extras })),
      presentations: presentations.map((p) => ({ id: p.id, kind: p.kind, price: p.price, items: p.items, pack: p.pack, sizes: p.sizes })),
    };
  }
}
