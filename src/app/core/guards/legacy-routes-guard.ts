import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

/**
 * Segmento viejo (en español) → segmento nuevo. Las rutas del frontend pasaron al inglés,
 * pero siguen circulando enlaces viejos: marcadores, correos ya enviados (/auth/verificar?token=...)
 * y la página de privacidad registrada en Google (/privacidad).
 */
const SEGMENTOS: Record<string, string> = {
  'privacidad': 'privacy',
  'cultivo': 'crops',
  'reportes': 'reports',
  'configuracion': 'settings',
  'resumen': 'summary',
  'usuarios': 'users',
  'agricultores': 'farmers',
  'insumos': 'inputs',
  'cultivos': 'crops',
  'cuenta': 'account',
  'registro': 'register',
  'recuperar': 'forgot-password',
  'verificar': 'verify',
  'restablecer': 'reset-password',
  'calendario': 'calendar',
  'inventario': 'inventory',
  'nueva-finca': 'new-farm',
  'finca': 'farm',
  'nuevo-lote': 'new-plot',
  'lote': 'plot',
  'nueva-siembra': 'new-planting',
  'siembra': 'planting',
  'editar': 'edit',
  'actividad': 'activity',
  'fumigacion': 'spraying',
  'cosecha': 'harvest',
  'inicio': 'home',
  'jornales': 'workdays',
  'nominas': 'payrolls',
  'pagos': 'payments',
  'labores': 'labors',
  'actividades': 'labors',
  'cargos': 'positions',
  'nuevo': 'new',
};

/** Traduce una URL vieja; devuelve null si no tenía nada que traducir. */
export function traducirRutaAntigua(url: string): string | null {
  const corte = url.search(/[?#]/);
  const ruta = corte === -1 ? url : url.slice(0, corte);
  const resto = corte === -1 ? '' : url.slice(corte);
  const nueva = ruta
    .split('/')
    .map((s) => (Object.prototype.hasOwnProperty.call(SEGMENTOS, s) ? SEGMENTOS[s] : s))
    .join('/');
  return nueva === ruta ? null : nueva + resto;
}

/** Para la ruta comodín: si es una URL vieja la manda a la nueva, si no al inicio. */
export const rutasAntiguasGuard: CanActivateFn = (_route, state) => {
  const router = inject(Router);
  const nueva = traducirRutaAntigua(state.url);
  return router.parseUrl(nueva ?? '/dashboard');
};
