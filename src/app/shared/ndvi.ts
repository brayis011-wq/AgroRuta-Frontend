/**
 * Rango de fechas para pedir el NDVI a Sentinel Hub: los últimos `dias` días hasta hoy.
 * Antes estaba fijo en '2026-04-01/2026-05-20', así que el mapa mostraba siempre la misma imagen vieja.
 */
export function rangoNdvi(dias: number, hoy: Date = new Date()): string {
  const fin = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const inicio = new Date(fin);
  inicio.setDate(inicio.getDate() - dias);
  return `${iso(inicio)}/${iso(fin)}`;
}

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
