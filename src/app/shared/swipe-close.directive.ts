import { Directive, ElementRef, NgZone, OnDestroy, inject, output } from '@angular/core';

/** Cuánto hay que arrastrar hacia la izquierda para que cuente como "cerrar" */
export const ARRASTRE_CIERRA_PX = 70;

/** Si el gesto es un arrastre horizontal hacia la izquierda (y no un intento de bajar por la lista) */
export function esArrastreIzquierda(dx: number, dy: number): boolean {
  return dx < -8 && Math.abs(dx) > Math.abs(dy) * 1.2;
}

/**
 * Cerrar un panel lateral arrastrándolo con el dedo hacia la izquierda: el panel sigue al dedo y,
 * si se suelta pasado el umbral, avisa con (arDeslizaCierra). Los toques normales y bajar por la
 * lista no se afectan. Escucha fuera de Angular para no repintar la app en cada movimiento.
 */
@Directive({ selector: '[arDeslizaCierra]' })
export class DeslizaCierraDirective implements OnDestroy {
  readonly arDeslizaCierra = output<void>();

  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly zona = inject(NgZone);
  private x0 = 0;
  private y0 = 0;
  private dx = 0;
  private arrastrando = false;

  private readonly alTocar = (e: TouchEvent) => {
    this.x0 = e.touches[0].clientX;
    this.y0 = e.touches[0].clientY;
    this.dx = 0;
    this.arrastrando = false;
  };

  private readonly alMover = (e: TouchEvent) => {
    const dx = e.touches[0].clientX - this.x0;
    const dy = e.touches[0].clientY - this.y0;
    if (!this.arrastrando && !esArrastreIzquierda(dx, dy)) return;
    this.arrastrando = true;
    this.dx = Math.min(0, dx);
    this.el.style.transition = 'none';
    this.el.style.transform = `translateX(${this.dx}px)`;
  };

  private readonly alSoltar = () => {
    if (!this.arrastrando) return;
    this.arrastrando = false;
    // De vuelta a los estilos de la hoja: se cierra o regresa a su sitio con su transición normal
    this.el.style.transition = '';
    this.el.style.transform = '';
    if (this.dx <= -ARRASTRE_CIERRA_PX) this.zona.run(() => this.arDeslizaCierra.emit());
  };

  constructor() {
    this.zona.runOutsideAngular(() => {
      this.el.addEventListener('touchstart', this.alTocar, { passive: true });
      this.el.addEventListener('touchmove', this.alMover, { passive: true });
      this.el.addEventListener('touchend', this.alSoltar, { passive: true });
      this.el.addEventListener('touchcancel', this.alSoltar, { passive: true });
    });
  }

  ngOnDestroy(): void {
    this.el.removeEventListener('touchstart', this.alTocar);
    this.el.removeEventListener('touchmove', this.alMover);
    this.el.removeEventListener('touchend', this.alSoltar);
    this.el.removeEventListener('touchcancel', this.alSoltar);
  }
}
