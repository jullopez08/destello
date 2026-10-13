// Paletas que la dueña puede elegir para su panel. Todas son pastel: el café
// chocolate solo se usa en letras, nunca de fondo. El frontend tiene los colores
// de cada una en `lib/palettes.ts`; aquí solo se valida el nombre.
export const PALETTES = ['vainilla', 'fresa', 'lavanda', 'menta', 'durazno', 'cielo'] as const;

export type Palette = (typeof PALETTES)[number];
