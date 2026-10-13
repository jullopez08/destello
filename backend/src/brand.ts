// Nombre y contacto de la marca en correos. Destello todavía no tiene dominio
// propio: mientras tanto el remitente sale de RESEND_FROM_EMAIL y el correo
// legal de LEGAL_EMAIL (por defecto el de la titular, Julieth Perdomo López).
export const BRAND_NAME = 'Destello';

export const LEGAL_EMAIL = process.env.LEGAL_EMAIL ?? 'legal@aggendarme.com';
