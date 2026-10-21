// Arqueo del cajón (Julieth, 2026-10-21; como los cierres de caja de Toast o Square). Quien cierra cuenta a ciegas:
// no ve cuánto debería haber. Si no cuadra, cuenta otra vez sin pistas; si en el segundo conteo tampoco, ahí sí ve la
// diferencia y escribe qué pasó. El turno se cierra igual (el negocio no se traba) y la dueña revisa la diferencia.

/** Diferencia que se acepta como "cuadra" (monedas y vueltos), en pesos. */
export const CASH_TOLERANCE = 500;

export type CloseOutcome =
  /** Cuadra, o ya se explicó la diferencia: se cierra */
  | { kind: 'close' }
  /** Primer conteo que no cuadra: contar de nuevo, sin decir cuánto */
  | { kind: 'recount' }
  /** Segundo conteo que no cuadra y sin explicación: se muestra la diferencia y se pide qué pasó */
  | { kind: 'explain'; difference: number };

export function closeOutcome(counted: number, expected: number, firstCount: number | null, note?: string | null): CloseOutcome {
  const difference = counted - expected;
  if (Math.abs(difference) < CASH_TOLERANCE) return { kind: 'close' };
  if (firstCount === null) return { kind: 'recount' };
  if (!note?.trim()) return { kind: 'explain', difference };
  return { kind: 'close' };
}

/** Lo que debe haber en el cajón: la base, el efectivo cobrado y lo que entró, menos lo que salió. */
export function expectedCash(parts: { openingCash: number; tables: number; pickups: number; moves: { kind: 'IN' | 'OUT'; amount: number }[] }) {
  return parts.openingCash + parts.tables + parts.pickups + parts.moves.reduce((a, m) => a + (m.kind === 'IN' ? m.amount : -m.amount), 0);
}
