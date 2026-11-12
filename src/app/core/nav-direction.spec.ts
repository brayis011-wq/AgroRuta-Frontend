import { describe, expect, it } from 'vitest';
import { ActivatedRouteSnapshot, UrlSegment } from '@angular/router';
import { nivel, sentido, tramos } from './nav-direction';

/** Una cadena de rutas como la que arma el router: cada nivel aporta sus tramos */
function ruta(...niveles: string[][]): ActivatedRouteSnapshot {
  let hijo: Partial<ActivatedRouteSnapshot> | null = null;
  for (const partes of [...niveles].reverse()) {
    hijo = { url: partes.map((p) => new UrlSegment(p, {})), firstChild: hijo as ActivatedRouteSnapshot | null };
  }
  return hijo as ActivatedRouteSnapshot;
}

describe('sentido de la navegación', () => {
  it('junta los tramos de todos los niveles de la ruta', () => {
    expect(tramos(ruta([], ['crops'], ['farm', '30']))).toEqual(['crops', 'farm', '30']);
    expect(tramos(ruta([]))).toEqual([]);
  });

  it('entrar a un detalle es hacia adelante y volver es hacia atrás', () => {
    expect(sentido(['crops'], ['crops', 'farm', '30'])).toBe('adelante');
    expect(sentido(['crops', 'farm', '30'], ['crops', 'planting', '16', 'log'])).toBe('adelante');
    expect(sentido(['crops', 'farm', '30'], ['crops'])).toBe('atras');
    expect(sentido(['worker', 'payrolls'], ['worker', 'payrolls', '5'])).toBe('adelante');
  });

  it('en Cultivos sigue el orden finca, lote, siembra aunque la dirección mida lo mismo', () => {
    expect(sentido(['crops', 'farm', '30'], ['crops', 'plot', '28'])).toBe('adelante');
    expect(sentido(['crops', 'plot', '28'], ['crops', 'planting', '16'])).toBe('adelante');
    expect(sentido(['crops', 'planting', '16'], ['crops', 'farm', '30'])).toBe('atras');
    expect(sentido(['crops', 'planting', '16'], ['crops', 'planting', '16', 'harvest'])).toBe('adelante');
    expect(sentido(['crops', 'planting', '16', 'edit'], ['crops', 'planting', '16'])).toBe('atras');
    expect(sentido(['crops', 'farm', '30'], ['crops', 'farm', '30', 'plot', '28', 'new-planting'])).toBe('adelante');
    expect(nivel(['crops'])).toBe(0);
    expect(nivel(['crops', 'calendar'])).toBe(nivel(['crops', 'inventory']));
  });

  it('cambiar de sección o quedarse al mismo nivel es de lado', () => {
    expect(sentido(['dashboard'], ['crops', 'farm', '30'])).toBe('lado');
    expect(sentido(['crops', 'farm', '30'], ['crops', 'farm', '31'])).toBe('lado');
    expect(sentido(['reports'], ['reports'])).toBe('lado');
  });
});
