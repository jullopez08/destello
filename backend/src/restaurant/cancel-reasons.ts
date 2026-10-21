// Por qué se anula una comanda (Julieth, 2026-10-21; como los motivos de anulación de Toast o Aloha: sin motivo no
// se puede revisar). Copia de los textos en frontend/lib/restaurant.ts (CANCEL_REASON_LABELS): si cambias uno, cambia el otro.
export const CANCEL_REASONS = ['LEFT', 'MISTAKE', 'SLOW', 'SOLD_OUT', 'OTHER'] as const;
export type CancelReason = (typeof CANCEL_REASONS)[number];
