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

// "¿Dónde te encontramos?" (Julieth, 2026-10-20): el usuario de Instagram o el enlace de Google Maps del negocio, para
// comprobar que es real. Devuelve el enlace limpio para abrirlo, o null si no es ninguno de los dos.
const INSTAGRAM_HOSTS = ['instagram.com', 'www.instagram.com', 'm.instagram.com'];
const MAPS_HOSTS = ['maps.app.goo.gl', 'goo.gl', 'maps.google.com', 'www.google.com', 'google.com', 'g.page', 'share.google'];
const HANDLE = /^[a-z0-9._]{1,30}$/i;

export function findUsLink(raw: string): string | null {
  const text = raw.trim();
  const handle = text.replace(/^@/, '');
  if (HANDLE.test(handle) && /[a-z0-9]/i.test(handle) && !handle.includes('..')) return `https://instagram.com/${handle.toLowerCase()}`;
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  if (INSTAGRAM_HOSTS.includes(host)) {
    const user = url.pathname.split('/').filter(Boolean)[0] ?? '';
    return HANDLE.test(user) ? `https://instagram.com/${user.toLowerCase()}` : null;
  }
  if (MAPS_HOSTS.includes(host)) {
    const isMaps = host !== 'goo.gl' && host !== 'www.google.com' && host !== 'google.com' ? true : url.pathname.startsWith('/maps');
    return isMaps && text.length <= 300 ? `https://${host}${url.pathname}${url.search}` : null;
  }
  return null;
}

/** La carta debe ser un PDF de verdad (se revisan los primeros bytes, no lo que diga el navegador). */
export const MENU_MAX_BYTES = 5 * 1024 * 1024;
export const isPdf = (buffer: Buffer) => buffer.length > 5 && buffer.toString('ascii', 0, 5) === '%PDF-';

// Una carta no necesita código, acciones que abran programas ni archivos adjuntos (Julieth, 2026-10-21: el PDF lo
// abre el super admin). Se buscan esas marcas del PDF, también escritas con #xx para esconderlas. No ve lo que va
// comprimido: es una capa más; la principal es abrir la carta en el visor del navegador, que la aísla.
const ACTIVE_PDF = /\/(JavaScript|JS|Launch|EmbeddedFile|EmbeddedFiles|RichMedia|XFA|SubmitForm|ImportData)(?![A-Za-z])/;
export const pdfHasActiveContent = (buffer: Buffer) =>
  ACTIVE_PDF.test(buffer.toString('latin1').replace(/#([0-9a-fA-F]{2})/g, (_, hex: string) => String.fromCharCode(parseInt(hex, 16))));
