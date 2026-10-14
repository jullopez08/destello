import type { IconName } from "@/components/ui/icon"

/** Secciones del panel: [hash, título, ícono]. */
export const PAGES: [string, string, IconName][] = [
  ["hoy", "Hoy", "hoy"],
  ["pedidos", "Pedidos", "pedidos"],
  ["produccion", "Producción", "produccion"],
  ["proveedores", "Proveedores", "proveedores"],
  ["insumos", "Insumos", "insumos"],
  ["compras", "Compras", "compras"],
  ["recetas", "Recetas y masas", "recetas"],
  ["productos", "Productos y cajas", "productos"],
  ["ediciones", "Ediciones especiales", "ediciones"],
  ["analitica", "Analítica", "analitica"],
  ["configuracion", "Configuración", "configuracion"],
  ["suscripcion", "Suscripción", "suscripcion"],
]

/** En el celular, la barra de abajo lleva estas tres; las demás se abren desde "Más". */
export const TAB_PAGES = ["hoy", "pedidos", "produccion"]

/** Color pastel de cada tarjeta en "Más", como el mockup. */
export const MORE_COLORS: Record<string, string> = {
  analitica: "c-sky",
  insumos: "c-mint",
  compras: "c-peach",
  proveedores: "c-lilac",
  recetas: "c-banana",
  productos: "c-strawberry",
  ediciones: "c-peach",
  configuracion: "c-sky",
  suscripcion: "c-mint",
}
