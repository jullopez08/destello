// Paletas que la dueña puede elegir (backend: organizations/palettes.ts).
// Los colores reales están en globals.css ([data-palette=…]); aquí solo el
// nombre y la muestra que se ve en Configuración.
export const PALETTES = [
  { id: "vainilla", name: "Vainilla", swatch: "#ffd23f", soft: "#fff7e6" },
  { id: "fresa", name: "Fresa", swatch: "#ffbccb", soft: "#fff6f7" },
  { id: "lavanda", name: "Lavanda", swatch: "#dcc6f2", soft: "#fbf8ff" },
  { id: "menta", name: "Menta", swatch: "#bfe8d1", soft: "#f6fcf8" },
  { id: "durazno", name: "Durazno", swatch: "#ffd0b0", soft: "#fff8f2" },
  { id: "cielo", name: "Cielo", swatch: "#c7dcff", soft: "#f6f9ff" },
] as const

export type PaletteId = (typeof PALETTES)[number]["id"]

export function applyPalette(palette: string | null | undefined) {
  if (typeof document === "undefined") return
  document.documentElement.dataset.palette = palette && PALETTES.some((p) => p.id === palette) ? palette : "vainilla"
}
