/** Cerca del inicio de la página la barra siempre está a la vista */
export const ZONA_ALTA_PX = 72;
/** Al llegar al final vuelve: ya no hay contenido que tapar y, sin ella, queda su hueco vacío */
export const ZONA_FINAL_PX = 24;
/** Movimiento mínimo para reaccionar: evita parpadeos con el temblor del dedo */
export const UMBRAL_PX = 6;

export interface Desplazamiento {
  /** Posición anterior y actual de la página */
  antes: number;
  ahora: number;
  /** Hasta dónde se puede bajar (alto de la página menos el de la pantalla) */
  maximo: number;
}

/**
 * La barra inferior del celular se esconde al bajar (para dejar toda la pantalla al contenido) y vuelve
 * al subir. Devuelve si debe quedar oculta después de un movimiento.
 */
export function barraOcultaTras(oculta: boolean, { antes, ahora, maximo }: Desplazamiento): boolean {
  if (ahora <= ZONA_ALTA_PX) return false;
  // Rebote elástico del navegador más allá del final (o del inicio): no cuenta como movimiento
  if (ahora < 0 || ahora > maximo) return oculta;
  if (ahora >= maximo - ZONA_FINAL_PX) return false;
  const delta = ahora - antes;
  if (delta > UMBRAL_PX) return true;
  if (delta < -UMBRAL_PX) return false;
  return oculta;
}

/** Campos en los que aparece el teclado del celular */
export function abreTeclado(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (el.isContentEditable || el instanceof HTMLTextAreaElement) return true;
  if (!(el instanceof HTMLInputElement)) return false;
  return !['checkbox', 'radio', 'range', 'file', 'button', 'submit', 'color'].includes(el.type);
}
