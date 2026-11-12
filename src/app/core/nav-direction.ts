import { ActivatedRouteSnapshot, ViewTransitionInfo } from '@angular/router';

export type SentidoNavegacion = 'adelante' | 'atras' | 'lado';

/** Los tramos de la dirección de una página, sin parámetros de consulta: /crops/farm/30 → ['crops', 'farm', '30'] */
export function tramos(raiz: ActivatedRouteSnapshot): string[] {
  const partes: string[] = [];
  for (let r: ActivatedRouteSnapshot | null = raiz; r; r = r.firstChild) {
    partes.push(...r.url.map((s) => s.path));
  }
  return partes;
}

/**
 * Hacia dónde se mueve el usuario: entrar a un detalle es "adelante", volver a la lista es "atrás"
 * y saltar entre secciones del menú es "de lado".
 */
export function sentido(desde: string[], hasta: string[]): SentidoNavegacion {
  if (desde[0] !== hasta[0]) return 'lado';
  const a = nivel(desde);
  const b = nivel(hasta);
  return b > a ? 'adelante' : b < a ? 'atras' : 'lado';
}

/** En Cultivos el orden no lo da el largo de la dirección: finca → lote → siembra */
const ORDEN_CULTIVOS: Record<string, number> = { farm: 1, plot: 2, planting: 3 };

/** Qué tan adentro de su sección está una página: 0 es la portada de la sección */
export function nivel(t: string[]): number {
  if (t.length <= 1) return 0;
  if (t[0] !== 'crops') return t.length - 1;
  // Lo que cuelga de una finca, lote o siembra (editar, registrar…) queda un poco más adentro que ella
  return (ORDEN_CULTIVOS[t[1]] ?? 1) + Math.max(0, t.length - 3) / 10;
}

/** Marca el sentido en <html data-nav> mientras dura la transición, para que el CSS mueva la página hacia ese lado */
export function marcarSentido({ transition, from, to }: ViewTransitionInfo): void {
  const raiz = document.documentElement;
  raiz.dataset['nav'] = sentido(tramos(from), tramos(to));
  const limpiar = () => delete raiz.dataset['nav'];
  transition.finished.then(limpiar, limpiar);
}
