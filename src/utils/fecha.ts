// Formateo de fechas para presentación (UI). No usar para lógica de negocio.

/** Epoch ms → fecha corta legible, ej: "30 jun 2026". */
export function formatearFecha(epochMs: number): string {
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(epochMs));
}
