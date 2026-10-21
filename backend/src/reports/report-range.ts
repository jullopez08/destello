import { BadRequestException } from '@nestjs/common';
import { daysBetween } from '../kitchen/kitchen-dates';

/** Un Excel cubre como mucho un año: suficiente para el contador y sin trabar el servidor. */
export const MAX_REPORT_DAYS = 366;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export interface ReportRange {
  /** "AAAA-MM-DD", hora de Bogotá (el proceso corre con TZ de Bogotá, `timezone.ts`) */
  from: string;
  to: string;
  /** Desde las 00:00 de `from` hasta antes de las 00:00 del día siguiente a `to` */
  start: Date;
  end: Date;
}

// "Desde / Hasta" que elige la dueña al descargar (Julieth, 2026-10-21). Fechas de verdad, en orden y de un año o menos.
export function reportRange(from: unknown, to: unknown): ReportRange {
  if (typeof from !== 'string' || typeof to !== 'string' || !ISO_DATE.test(from) || !ISO_DATE.test(to)) {
    throw new BadRequestException('Elige desde qué fecha y hasta cuál.');
  }
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) throw new BadRequestException('Esa fecha no existe.');
  const days = daysBetween(from, to);
  if (days < 0) throw new BadRequestException('La fecha "Desde" debe ser antes de "Hasta".');
  if (days >= MAX_REPORT_DAYS) throw new BadRequestException('Descarga máximo un año a la vez.');
  end.setDate(end.getDate() + 1);
  return { from, to, start, end };
}
