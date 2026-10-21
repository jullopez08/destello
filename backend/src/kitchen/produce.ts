import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { consumedAmount, productionPlan, toIsoDate, type KitchenRuleData } from './kitchen-rules';
import { consumeSupply } from './supply-batches';

type Line = Parameters<typeof productionPlan>[0][number];

// Descuenta lo que lleva un grupo de líneas: primero la masa de los lotes (vence antes, primero) y después los
// insumos (lo que vence antes, primero). La usan la producción del día y el "Listo" de la cocina (comandas).
// `strict`: la producción no se registra si falta algo; un plato que la cocina ya hizo no se puede "deshacer",
// así que ahí se descuenta lo que haya.
export async function produce(tx: Prisma.TransactionClient, organizationId: string, lines: Line[], data: KitchenRuleData, strict: boolean) {
  const plan = productionPlan(lines, data);
  if (strict && plan.shortages.length) {
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
    // supply.stock ya es lo que no está vencido (ruleData)
    await consumeSupply(tx, supply.id, Math.min(supply.stock, consumedAmount(supply.kind, need.need)), toIsoDate(new Date()));
  }

  await tx.doughLot.deleteMany({ where: { organizationId, left: { lte: 0.5 } } });
  return plan;
}

/** Lo que se come en la mesa no lleva caja ni bolsa: las reglas sin empaques (comandas del restaurante). */
export function withoutPackaging(data: KitchenRuleData): KitchenRuleData {
  return {
    ...data,
    presentations: data.presentations.map((p) => ({ ...p, pack: [], sizes: p.sizes?.map((z) => ({ ...z, packSupplyId: null })) })),
  };
}
