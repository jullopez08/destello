// Guía del panel (Julieth, 2026-10-19). Investigación: las guías largas casi no ayudan (NN/g) y se abandonan
// pasados 5 a 7 pasos; mejor explicar cada sección cuando se llega a ella. Por eso:
// · TOUR_STEPS: 5 pasos al terminar los primeros pasos (lo de todos los días).
// · SECTION_TIPS: una tarjeta la primera vez que entra a cada sección.
// Textos: título de 2 a 4 palabras y una sola frase que dice qué puede hacer. Las tarjetas de sección dicen qué
// conviene hacer ahí (el subtítulo ya dice para qué sirve: no se repite).

export interface TourStep {
  page: string
  /** Lo primero de la lista que se vea se resalta; sin nada, la tarjeta sale en el centro. */
  targets?: string[]
  title: string
  text: string
}

export const TOUR_STEPS: TourStep[] = [
  { page: "hoy", title: "¡Tu cocina está lista!", text: "Te muestro lo de todos los días en 5 pasos." },
  { page: "hoy", targets: ["[data-tour=hoy-cifras]"], title: "Tu día en cifras", text: "Toca una cifra para ver el detalle." },
  {
    page: "pedidos",
    targets: ["[data-tour=nuevo-pedido]"],
    title: "Anota cada pedido",
    text: "Cuando te pidan por WhatsApp, regístralo aquí. El precio sale solo.",
  },
  {
    page: "produccion",
    targets: ["main .head"],
    title: "Lo que toca hacer hoy",
    text: "Marca cada paso y al final registra la producción: los insumos se descuentan solos.",
  },
  {
    page: "hoy",
    targets: [".tabbar a[href='#mas']", ".side .nav"],
    title: "Todo lo demás",
    text: "Insumos, recetas, productos y más. Cada sección te explica qué hace la primera vez que entras.",
  },
]

/** Tarjeta de la primera vez en cada sección: [título, frase]. */
export const SECTION_TIPS: Record<string, [string, string]> = {
  insumos: ["Tus insumos", "Revisa «Bajos» antes de comprar y «Por vencer» para no botar nada."],
  compras: ["Tus compras", "Anota cada compra: así sabes cuánto te cuesta hacer cada producto."],
  proveedores: ["Tus proveedores", "Guarda su WhatsApp para pedirles rápido."],
  recetas: ["Recetas y masas", "¿Haces masa por adelantado? Regístrala como lote y sabrás hasta cuándo dura."],
  productos: ["Lo que vendes", "Mira cuánto te deja cada uno antes de ponerle precio."],
  ediciones: ["Ediciones especiales", "Abre una para Navidad o Amor y Amistad, con fechas y cupo."],
  caja: ["La caja", "Cobra aquí las mesas cuando el cliente paga en la caja."],
  analitica: ["Cómo va tu negocio", "Mira qué no te deja ganancia para decidir qué cambiar."],
  configuracion: ["Tu negocio", "Aquí cambias la hora de corte, tus llaves Bre-B, los repartidores, los colores y el logo."],
}

/** Evento para volver a ver la guía y las tarjetas (botón en Configuración). */
export const TOUR_START_EVENT = "destello:tour"
