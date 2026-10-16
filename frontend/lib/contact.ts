// Contacto de la página de presentación. El número de WhatsApp de Destello aún no está
// definido (pendiente de Julieth): se pone en NEXT_PUBLIC_CONTACT_WHATSAPP (solo dígitos,
// con 57). Sin él, los botones llevan a la sección de contacto de la misma página.
const WHATSAPP = (process.env.NEXT_PUBLIC_CONTACT_WHATSAPP ?? "").replace(/\D/g, "")

export function contactHref(message: string): string {
  return WHATSAPP ? `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(message)}` : "#contacto"
}

export const TRIAL_MESSAGE = "Hola, quiero probar Destello gratis en mi negocio."
export const RESTAURANT_MESSAGE = "Hola, tengo un restaurante con mesas y quiero saber cuándo estará Destello para restaurantes."
