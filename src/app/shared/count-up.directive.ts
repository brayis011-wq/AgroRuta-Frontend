import { Directive, ElementRef, OnDestroy, effect, inject, input } from '@angular/core';

const DURACION_MS = 650;
const suave = (t: number) => 1 - Math.pow(1 - t, 3);

/** Con cuántos decimales se muestra un valor mientras sube (los del valor final, máximo 2) */
export function decimalesDe(valor: number): number {
  if (!Number.isFinite(valor) || Number.isInteger(valor)) return 0;
  return Math.min(2, (String(valor).split('.')[1] ?? '').length);
}

/** Sin animaciones en el navegador (o si la persona pidió menos movimiento) se muestra el valor de una vez */
function seAnima(): boolean {
  return typeof requestAnimationFrame === 'function' && typeof matchMedia === 'function'
    && !matchMedia('(prefers-reduced-motion: reduce)').matches && !document.hidden;
}

/**
 * Hace que un número "suba" hasta su valor: `<strong [arContar]="total" [formato]="pesos"></strong>`.
 * La primera vez parte de cero; si el valor cambia después, parte de lo que se estaba mostrando.
 */
@Directive({ selector: '[arContar]' })
export class ContarDirective implements OnDestroy {
  readonly arContar = input.required<number | null | undefined>();
  readonly formato = input<(valor: number) => string>((v) => String(v));

  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private mostrado = 0;
  private cuadro = 0;

  constructor() {
    effect(() => {
      const destino = Number(this.arContar() ?? 0);
      const formato = this.formato();
      this.cancelar();
      if (!Number.isFinite(destino) || destino === this.mostrado || !seAnima()) {
        this.pintar(Number.isFinite(destino) ? destino : 0, formato);
        return;
      }
      const desde = this.mostrado;
      const decimales = decimalesDe(destino);
      const factor = 10 ** decimales;
      let inicio = -1;
      const paso = (ahora: number) => {
        if (inicio < 0) inicio = ahora;
        const t = Math.min(1, (ahora - inicio) / DURACION_MS);
        const valor = t === 1 ? destino : Math.round((desde + (destino - desde) * suave(t)) * factor) / factor;
        this.pintar(valor, formato);
        this.cuadro = t < 1 ? requestAnimationFrame(paso) : 0;
      };
      // Mientras llega el primer cuadro se ve el punto de partida, no un hueco
      this.pintar(desde, formato);
      this.cuadro = requestAnimationFrame(paso);
    });
  }

  ngOnDestroy(): void {
    this.cancelar();
  }

  private pintar(valor: number, formato: (valor: number) => string): void {
    this.mostrado = valor;
    this.el.textContent = formato(valor);
  }

  private cancelar(): void {
    if (this.cuadro) cancelAnimationFrame(this.cuadro);
    this.cuadro = 0;
  }
}
