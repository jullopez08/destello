// Primeros pasos obligatorios de un negocio nuevo (decisión de Julieth, 2026-10-17):
// antes de usar el panel configura el negocio, crea una receta, agrega una llave
// Bre-B y un repartidor. Mismos pasos en frontend/components/kitchen/views/setup-view.tsx.

export interface SetupState {
  whatsapp: string | null;
  recipes: number;
  brebKeys: number;
  couriers: number;
}

/** Lo que falta, en el orden en que se pide; vacío = listo. */
export function setupMissing(state: SetupState): string[] {
  const missing: string[] = [];
  if (!state.whatsapp?.trim()) missing.push('el WhatsApp del negocio');
  if (state.recipes < 1) missing.push('una receta');
  if (state.brebKeys < 1) missing.push('una llave Bre-B');
  if (state.couriers < 1) missing.push('un repartidor');
  return missing;
}
