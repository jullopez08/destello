import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type Db = PrismaService | Prisma.TransactionClient;

// Analítica de las mesas (Julieth, 2026-10-20; solo negocios con mesas). Se manda resumida por día (no cada mesa) porque
// el estado completo viaja en cada cambio:
// · ventas: lo vendido en mesas cobradas en 70 días, por día y por plato, más cuántas mesas se cobraron cada día.
//   La propina no cuenta: es del personal.
// · tiempos: cuánto tarda en cocina la comanda de cada plato (de "Enviar a cocina" a "Listo"), en 4 semanas.
export const TABLE_SALES_DAYS = 70;
export const DISH_TIME_DAYS = 28;

export type TableSaleLine = { date: string; presentationId: string; productId: string | null; sizeId: string | null; unitPrice: number; qty: number };
export type DishTime = { presentationId: string; productId: string | null; minutes: number; count: number };

export async function tableAnalytics(db: Db, organizationId: string) {
  const tz = process.env.TZ || 'America/Bogota';
  const since = new Date(Date.now() - TABLE_SALES_DAYS * 86_400_000);
  const timesSince = new Date(Date.now() - DISH_TIME_DAYS * 86_400_000);
  const [lines, days, times] = await Promise.all([
    db.$queryRaw<(Omit<TableSaleLine, 'qty' | 'unitPrice'> & { unitPrice: number; qty: bigint })[]>`
      SELECT to_char((s."closedAt" AT TIME ZONE 'UTC') AT TIME ZONE ${tz}, 'YYYY-MM-DD') AS "date",
             l."presentationId", l."productId", l."sizeId", l."unitPrice", SUM(l.qty) AS "qty"
      FROM "TicketLine" l
      JOIN "KitchenTicket" k ON k.id = l."ticketId"
      JOIN "TableSession" s ON s.id = k."sessionId"
      WHERE s."organizationId" = ${organizationId} AND s.status = 'CLOSED' AND s."closedAt" >= ${since}
      GROUP BY 1, 2, 3, 4, 5`,
    db.$queryRaw<{ date: string; tables: bigint }[]>`
      SELECT to_char((s."closedAt" AT TIME ZONE 'UTC') AT TIME ZONE ${tz}, 'YYYY-MM-DD') AS "date", COUNT(*) AS "tables"
      FROM "TableSession" s
      WHERE s."organizationId" = ${organizationId} AND s.status = 'CLOSED' AND s."closedAt" >= ${since} AND s.subtotal > 0
      GROUP BY 1`,
    db.$queryRaw<{ presentationId: string; productId: string | null; minutes: number; count: bigint }[]>`
      SELECT l."presentationId", l."productId",
             AVG(EXTRACT(EPOCH FROM (k."readyAt" - k."sentAt")) / 60)::float AS "minutes", COUNT(*) AS "count"
      FROM "TicketLine" l
      JOIN "KitchenTicket" k ON k.id = l."ticketId"
      WHERE k."organizationId" = ${organizationId} AND k."readyAt" IS NOT NULL AND k."sentAt" >= ${timesSince}
      GROUP BY 1, 2`,
  ]);
  return {
    tableSales: {
      days: days.map((d) => ({ date: d.date, tables: Number(d.tables) })),
      lines: lines.map((l) => ({ ...l, qty: Number(l.qty) })),
    },
    dishTimes: times.map((t) => ({ ...t, minutes: Math.round(t.minutes * 10) / 10, count: Number(t.count) })),
  };
}
