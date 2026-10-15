// Fechas de la cocina ("AAAA-MM-DD", hora de Bogotá). Copia en
// `backend/src/kitchen/kitchen-dates.ts`: si cambias una, cambia la otra.

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
