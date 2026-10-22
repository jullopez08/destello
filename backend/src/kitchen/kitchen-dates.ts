// Fechas de la cocina ("AAAA-MM-DD", hora de Bogotá). Copia en
// `frontend/lib/kitchen/dates.ts`: si cambias una, cambia la otra.

const pad = (n: number) => String(n).padStart(2, '0');

export function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00`);
  d.setDate(d.getDate() + days);
  return toIsoDate(d);
}

export function weekdayOf(isoDate: string): number {
  return new Date(`${isoDate}T12:00:00`).getDay();
}

// Día en que se produce un pedido tomado en `now`: después de la hora de corte
// pasa al día siguiente, y se salta los días en que el negocio está cerrado.
export function productionDateFor(now: Date, cutoff: string, closedDays: number[]): string {
  const [h, m] = cutoff.split(':').map(Number);
  let day = toIsoDate(now);
  if (now.getHours() * 60 + now.getMinutes() >= h * 60 + m) day = addDays(day, 1);
  for (let i = 0; i < 7 && closedDays.includes(weekdayOf(day)); i++) day = addDays(day, 1);
  return day;
}

// Día que se puede escoger para un pedido (Julieth, 2026-10-22, como el "Reprogramar" de Toast): desde el primero
// posible (`earliest`, por la hora de corte) hasta MAX_ORDER_DAYS días, sin días cerrados.
export const MAX_ORDER_DAYS = 60;

export function orderDateProblem(day: string, earliest: string, today: string, closedDays: number[]): string | null {
  if (day < earliest) return earliest === today ? 'Escoge hoy o un día después.' : 'Por la hora de corte, escoge desde el siguiente día de producción.';
  if (closedDays.includes(weekdayOf(day))) return 'Ese día el negocio está cerrado.';
  if (daysBetween(today, day) > MAX_ORDER_DAYS) return `Solo se toman pedidos hasta ${MAX_ORDER_DAYS} días adelante.`;
  return null;
}

// Días de `from` a `to` (negativo si `to` ya pasó).
export function daysBetween(from: string, to: string): number {
  return Math.round((new Date(`${to}T12:00:00`).getTime() - new Date(`${from}T12:00:00`).getTime()) / 86400000);
}

// Una masa se usa hasta el día antes de `expiresOn`: hecha el lunes con 4 días,
// vence el viernes y se usa de lunes a jueves. La vencida no se cuenta ni se gasta.
export function usableLots<T extends { expiresOn: string }>(lots: T[], today: string): T[] {
  return lots.filter((l) => l.expiresOn > today);
}
