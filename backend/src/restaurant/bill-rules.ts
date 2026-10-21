// Reglas de la cuenta de una mesa (Julieth, 2026-10-20). Copia de tipFor en frontend/lib/restaurant.ts: si cambias
// una, cambia la otra.

/** Propina sugerida: el 10 % de lo consumido, voluntaria (el cliente dice si la acepta). */
export const TIP_PERCENT = 10;

/** La Ley 1935 de 2018 no deja pasar del 10 % del servicio sin impuestos: se calcula sobre el precio sin el impuesto
 *  incluido y se redondea hacia abajo, para no pasarse ni un peso (Julieth, 2026-10-21). */
export const tipFor = (subtotal: number, taxRate = 0) => Math.floor((subtotal / (1 + taxRate)) * TIP_PERCENT / 100 + 1e-6);

const pesos = (n: number) => `$${n.toLocaleString('es-CO')}`;

export type BillPayment = { method: 'CASH' | 'TRANSFER' | 'CARD'; amount: number };

/** Error que ve la persona, o null si los pagos cubren exacto el total (una forma o varias). */
export function paymentProblem(total: number, payments: BillPayment[]): string | null {
  if (total <= 0) return payments.length ? 'Esta mesa no consumió nada: se libera sin cobrar.' : null;
  if (!payments.length) return 'Elige cómo paga.';
  if (payments.some((p) => !Number.isInteger(p.amount) || p.amount < 1)) return 'Cada pago debe tener su valor.';
  const paid = payments.reduce((a, p) => a + p.amount, 0);
  if (paid < total) return `Faltan ${pesos(total - paid)} por cobrar.`;
  if (paid > total) return `Los pagos suman ${pesos(paid - total)} de más.`;
  return null;
}
