import { createHash, randomBytes, randomInt, timingSafeEqual } from 'crypto';

// Reglas puras del equipo del restaurante (meseros y pantalla de cocina), probadas en staff-rules.spec.ts.

export const MAX_PIN_FAILS = 5;
export const PIN_LOCK_MS = 15 * 60 * 1000;
export const SESSION_HOURS = 12;
export const DEVICE_COOKIE = 'staff_device';
export const SESSION_COOKIE = 'staff_session';
export const DEVICE_COOKIE_MS = 365 * 24 * 60 * 60 * 1000;

/** Secreto largo al azar para el enlace fijo y los aparatos (43 caracteres). */
export function newSecret(): string {
  return randomBytes(32).toString('base64url');
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function sameHash(value: string, storedHash: string): boolean {
  const a = Buffer.from(sha256(value), 'hex');
  const b = Buffer.from(storedHash, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

/** PIN de 4 números al azar (lo genera Destello, Julieth 2026-10-19), sin los fáciles de adivinar. */
export function newPin(): string {
  for (;;) {
    const pin = String(randomInt(0, 10000)).padStart(4, '0');
    if (!isWeakPin(pin)) return pin;
  }
}

/** 1111, 1234, 4321… */
export function isWeakPin(pin: string): boolean {
  const d = [...pin].map(Number);
  const steps = d.slice(1).map((x, i) => x - d[i]);
  return steps.every((s) => s === 0) || steps.every((s) => s === 1) || steps.every((s) => s === -1);
}

/** Cookie del aparato: "id.secreto". Devuelve null si no tiene esa forma. */
export function parseDeviceCookie(value: string | undefined): { id: string; secret: string } | null {
  if (!value) return null;
  const dot = value.indexOf('.');
  if (dot < 1 || dot === value.length - 1) return null;
  return { id: value.slice(0, dot), secret: value.slice(dot + 1) };
}

/** ¿Está bloqueado por PIN equivocado? */
export function isLocked(lockedUntil: Date | null, now: Date): boolean {
  return !!lockedUntil && lockedUntil > now;
}

/** Tras un PIN equivocado (en el aparato o al abrir el enlace): cuántos van y, al llegar a 5, hasta cuándo queda bloqueado (y vuelve a 0). */
export function afterWrongPin(failedPins: number, now: Date): { failedPins: number; lockedUntil: Date | null } {
  const next = failedPins + 1;
  return next >= MAX_PIN_FAILS ? { failedPins: 0, lockedUntil: new Date(now.getTime() + PIN_LOCK_MS) } : { failedPins: next, lockedUntil: null };
}
