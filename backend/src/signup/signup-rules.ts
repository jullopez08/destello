import { createHash, randomInt, timingSafeEqual } from 'crypto';

// Reglas puras de la inscripción por la página (sin BD), probadas en signup-rules.spec.ts.

export type SignupMode = 'open' | 'review' | 'closed';

/** SIGNUP_MODE: open = entra sola, review = el super admin la aprueba, closed = sin inscripción. */
export function signupMode(value: string | undefined): SignupMode {
  return value === 'review' || value === 'closed' ? value : 'open';
}

export const CODE_MINUTES = 15;
export const MAX_CODE_ATTEMPTS = 5;
/** Tiempo mínimo entre dos códigos al mismo correo */
export const RESEND_WAIT_MS = 60 * 1000;

export function newCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

export function hashCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

export function codeMatches(code: string, storedHash: string): boolean {
  const a = Buffer.from(hashCode(code.trim()), 'hex');
  const b = Buffer.from(storedHash, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Últimos 10 dígitos: "+57 300 123 4567" y "3001234567" son el mismo número. */
export function phoneKey(phone: string): string {
  return phone.replace(/\D/g, '').slice(-10);
}

/** Como se escribe en el panel (phoneInput del frontend): "311 222 3344". */
export function phoneDisplay(key: string): string {
  return [key.slice(0, 3), key.slice(3, 6), key.slice(6)].filter(Boolean).join(' ');
}
