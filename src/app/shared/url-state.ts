import { ActivatedRoute, Router } from '@angular/router';

/**
 * Filtros y pestañas de una lista guardados en la dirección (?estado=SUSPENDIDO&q=ana): así "atrás",
 * recargar o compartir el enlace muestran lo mismo. Se reemplaza la entrada del historial para que
 * cada letra o clic en un filtro no llene el botón "atrás".
 */
export function guardarEnUrl(router: Router, route: ActivatedRoute | null | undefined,
                             params: Record<string, string | number | null>): void {
  try {
    router.navigate([], { relativeTo: route ?? undefined, queryParams: params, queryParamsHandling: 'merge', replaceUrl: true })
      ?.catch?.(() => undefined);
  } catch {
    // Si la dirección no se puede actualizar, el filtro igual funciona en la pantalla
  }
}

/** Valor inicial de un filtro guardado en la dirección; si no está o no es válido, null */
export function leerDeUrl(route: ActivatedRoute | null | undefined, nombre: string, validos?: readonly string[]): string | null {
  const v = route?.snapshot?.queryParamMap?.get(nombre) ?? null;
  if (v == null) return null;
  return !validos || validos.includes(v) ? v : null;
}
