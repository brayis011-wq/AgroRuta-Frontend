import { Directive, HostListener, inject, input } from '@angular/core';
import { Observable, catchError, forkJoin, of } from 'rxjs';
import { CultivoService } from '../core/services/crop.service';

/** A qué apunta el enlace: se piden de antemano los mismos datos que pide esa pantalla al abrirse */
export interface Precarga {
  tipo: 'planting' | 'plot';
  id: number | null | undefined;
}

/** No se repite la misma precarga en este tiempo (la copia breve del interceptor dura 10 s) */
const REPETIR_TRAS_MS = 8_000;
const hechas = new Map<string, number>();

/** Para las pruebas */
export function olvidarPrecargas(): void {
  hechas.clear();
}

/**
 * Precargar al acercarse: al pasar el ratón (un instante) o al tocar un enlace a una siembra o un lote,
 * se piden sus datos. La pantalla los encuentra en la copia breve del interceptor y abre sin la espera
 * del servidor. Si algo falla, no pasa nada: la pantalla lo vuelve a pedir.
 *
 *   <a [routerLink]="['/crops/planting', s.id]" [arPrecargar]="{ tipo: 'planting', id: s.id }">
 */
@Directive({ selector: '[arPrecargar]', standalone: true })
export class PrecargarDirective {
  private readonly cultivo = inject(CultivoService);
  readonly arPrecargar = input<Precarga | null>(null);
  private reloj: ReturnType<typeof setTimeout> | null = null;

  @HostListener('mouseenter')
  alAcercarRaton(): void {
    // Un instante: pasar el ratón por encima camino a otro lado no pide nada
    this.reloj = setTimeout(() => this.precargar(), 90);
  }

  @HostListener('mouseleave')
  alAlejarRaton(): void {
    if (this.reloj) {
      clearTimeout(this.reloj);
      this.reloj = null;
    }
  }

  @HostListener('touchstart')
  @HostListener('focus')
  precargar(): void {
    const p = this.arPrecargar();
    if (!p?.id) return;
    const clave = `${p.tipo}:${p.id}`;
    const antes = hechas.get(clave);
    if (antes && Date.now() - antes < REPETIR_TRAS_MS) return;
    hechas.set(clave, Date.now());
    const pedidos: Observable<unknown>[] =
      p.tipo === 'planting'
        ? [
            this.cultivo.buscarSiembra(p.id),
            this.cultivo.listarActividades(p.id),
            this.cultivo.listarFumigaciones(p.id),
            this.cultivo.listarCosechas(p.id),
          ]
        : [this.cultivo.buscarLote(p.id), this.cultivo.historialLote(p.id)];
    forkJoin(pedidos.map((o) => o.pipe(catchError(() => of(null))))).subscribe();
  }
}
