import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { toIsoDate } from '../kitchen/kitchen-dates';
import { PrismaService } from '../prisma/prisma.service';

// Inventario de cada día (Julieth, 2026-10-21; como Restaurant365 o Maitre'D): cada noche se guarda cuánto había de
// cada insumo y a qué costo. Con eso, en un periodo: gastado = inicial + compras − botado − final. Lo gastado incluye
// la producción, las comandas y cualquier ajuste a mano del inventario.

export interface Movement {
  /** null si aún no había inventario guardado antes del periodo */
  start: number | null;
  purchased: number;
  wasted: number;
  end: number;
  /** null si no hay inicial */
  used: number | null;
}

export function stockMovement(start: number | null, purchased: number, wasted: number, end: number): Movement {
  return { start, purchased, wasted, end, used: start === null ? null : Math.max(0, start + purchased - wasted - end) };
}

/** Guarda (o actualiza) el inventario de `date` de todos los negocios. */
export async function saveStockDay(prisma: PrismaService, date: string, organizationId?: string) {
  const supplies = await prisma.supply.findMany({ where: organizationId ? { organizationId } : {}, select: { id: true, organizationId: true, stock: true, cost: true } });
  for (const s of supplies) {
    await prisma.supplyStockDay.upsert({
      where: { supplyId_date: { supplyId: s.id, date } },
      create: { organizationId: s.organizationId, supplyId: s.id, date, stock: s.stock, cost: s.cost },
      update: { stock: s.stock, cost: s.cost },
    });
  }
  return supplies.length;
}

@Injectable()
export class StockDaysCron {
  private readonly logger = new Logger(StockDaysCron.name);

  constructor(private readonly prisma: PrismaService) {}

  // 11:55 p. m. (hora de Bogotá, `timezone.ts`): lo que quedó al cierre del día.
  @Cron('55 23 * * *')
  async run() {
    const count = await saveStockDay(this.prisma, toIsoDate(new Date()));
    this.logger.log(`Inventario del día guardado: ${count} insumos.`);
  }
}
