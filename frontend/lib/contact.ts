// Contacto de la página de presentación. El número de WhatsApp de Destello aún no está
// definido (pendiente de Julieth): se pone en NEXT_PUBLIC_CONTACT_WHATSAPP (solo dígitos,
// con 57). Sin él, los botones llevan a la sección de contacto de la misma página.
const WHATSAPP = (process.env.NEXT_PUBLIC_CONTACT_WHATSAPP ?? "").replace(/\D/g, "")

export function contactHref(message: string): string {
  return WHATSAPP ? `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(message)}` : "#contacto"
}

export const TRIAL_MESSAGE = "Hola, quiero probar Destello gratis en mi negocio."
export const RESTAURANT_MESSAGE = "Hola, tengo un restaurante con mesas y quiero saber cuándo estará Destello para restaurantes."

// Archivo de Android (APK, hecho con Capacitor en la Fase 10). Sin Play Store por decisión de Julieth:
// se descarga desde la página de presentación. Mientras no exista, el botón dice "Muy pronto".
export const ANDROID_APK_URL = process.env.NEXT_PUBLIC_ANDROID_APK_URL ?? ""
