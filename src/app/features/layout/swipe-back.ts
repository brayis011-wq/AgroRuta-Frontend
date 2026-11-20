/** Un punto del dedo: posición y momento */
export interface PuntoToque { x: number; y: number; t: number }

/**
 * Deslizar desde el borde izquierdo hacia la derecha para volver: al menos 80 px de recorrido,
 * casi horizontal (no un scroll) y en menos de 600 ms (no un arrastre lento por accidente).
 */
export function esDeslizarParaVolver(inicio: PuntoToque, fin: PuntoToque): boolean {
  const dx = fin.x - inicio.x;
  const dy = Math.abs(fin.y - inicio.y);
  return dx >= 80 && dy <= dx * 0.5 && fin.t - inicio.t <= 600;
}
