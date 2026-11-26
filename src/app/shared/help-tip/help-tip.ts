import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  Injector,
  afterNextRender,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

let siguienteId = 0;

/**
 * Botón (?) que explica una palabra técnica en una frase: "Carencia (?)".
 * Se abre con clic o toque (también con el teclado) y se cierra con Esc, con un clic afuera, al volver a tocarlo
 * o si el botón sale de la pantalla.
 *
 *   <app-ayuda clave="help.carencia" />
 */
@Component({
  selector: 'app-ayuda',
  standalone: true,
  imports: [TranslatePipe],
  template: `
    <button
      #boton
      type="button"
      class="ayuda"
      (click)="alternar($event)"
      [attr.aria-expanded]="abierta()"
      [attr.aria-controls]="id"
      [attr.aria-label]="
        'help.open' | translate: { term: termino() ? (termino()! | translate) : '' }
      "
    >
      <i class="ti ti-help-circle" aria-hidden="true"></i>
    </button>
    @if (abierta()) {
      <!-- popover: va a la capa superior del navegador, así no la recorta un contenedor con efecto de vidrio o animación -->
      <span
        #burbuja
        class="burbuja"
        [id]="id"
        role="note"
        [attr.popover]="conPopover ? 'manual' : null"
        [style.top.px]="pos().top"
        [style.left.px]="pos().left"
      >
        @if (termino()) {
          <b>{{ termino()! | translate }}</b>
        }
        {{ clave() | translate }}
      </span>
    }
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        vertical-align: middle;
      }
      .ayuda {
        display: inline-grid;
        place-items: center;
        width: 22px;
        height: 22px;
        padding: 0;
        border: 0;
        border-radius: 50%;
        background: none;
        color: var(--ar-tinta-3);
        cursor: pointer;
        font-size: 17px;
        line-height: 1;
        transition:
          color 0.15s,
          background 0.15s;
      }
      .ayuda:hover,
      .ayuda[aria-expanded='true'] {
        color: var(--ar-verde-700);
        background: var(--ar-verde-50);
      }
      .ayuda:focus-visible {
        outline: 2px solid var(--ar-verde-600);
        outline-offset: 1px;
      }
      .burbuja {
        position: fixed;
        z-index: 60;
        box-sizing: border-box;
        width: min(280px, calc(100vw - 24px));
        padding: 0.65rem 0.8rem;
        border-radius: 12px;
        background: var(--ar-tinta);
        color: var(--ar-superficie);
        font-size: 0.82rem;
        font-weight: 500;
        line-height: 1.45;
        text-transform: none;
        letter-spacing: normal;
        text-align: left;
        white-space: normal;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.22);
        animation: aparecer 0.15s ease-out;
      }
      .burbuja[popover] {
        inset: auto;
        margin: 0;
        border: 0;
        overflow: visible;
      }
      .burbuja b {
        display: block;
        margin-bottom: 0.15rem;
        font-weight: 700;
      }
      @keyframes aparecer {
        from {
          opacity: 0;
          transform: translateY(-3px);
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .burbuja {
          animation: none;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AyudaComponent {
  /** Clave de traducción de la explicación */
  readonly clave = input.required<string>();
  /** Clave de traducción de la palabra que se explica (título de la burbuja y nombre del botón) */
  readonly termino = input<string | null>(null);

  readonly id = `ayuda-${++siguienteId}`;
  readonly abierta = signal(false);
  readonly pos = signal({ top: 0, left: 0 });

  /** Navegadores sin Popover API (anteriores a 2024): la burbuja queda fija normal */
  readonly conPopover =
    typeof HTMLElement !== 'undefined' && typeof HTMLElement.prototype.showPopover === 'function';

  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly injector = inject(Injector);
  private readonly boton = viewChild.required<ElementRef<HTMLButtonElement>>('boton');
  private readonly burbuja = viewChild<ElementRef<HTMLElement>>('burbuja');

  alternar(ev: Event): void {
    ev.stopPropagation(); // que no la cierre el clic afuera (y no active el enlace o la fila de alrededor)
    ev.preventDefault();
    if (this.abierta()) {
      this.abierta.set(false);
      return;
    }
    this.pos.set(
      posicionBurbuja(
        this.boton().nativeElement.getBoundingClientRect(),
        window.innerWidth,
        window.innerHeight,
      ),
    );
    this.abierta.set(true);
    // Cuando ya está en la página, se sube a la capa superior (al quitarla del DOM se cierra sola)
    afterNextRender(
      () => {
        const el = this.burbuja()?.nativeElement;
        if (this.conPopover && el && !el.matches(':popover-open')) el.showPopover();
      },
      { injector: this.injector },
    );
  }

  @HostListener('document:click', ['$event'])
  alClicAfuera(ev: Event): void {
    if (this.abierta() && !this.host.nativeElement.contains(ev.target as Node))
      this.abierta.set(false);
  }

  @HostListener('document:keydown.escape')
  alEscape(): void {
    if (!this.abierta()) return;
    this.abierta.set(false);
    this.boton().nativeElement.focus();
  }

  constructor() {
    // La burbuja está fija en pantalla: al desplazar cualquier contenedor (el contenido de la app no
    // se desplaza en window) o cambiar el tamaño, sigue al botón. Se escucha en captura porque
    // el evento scroll no sube. Si el botón sale de la pantalla, se cierra.
    const alMoverse = () => {
      if (!this.abierta()) return;
      const r = this.boton().nativeElement.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) {
        this.abierta.set(false);
        return;
      }
      this.pos.set(posicionBurbuja(r, window.innerWidth, window.innerHeight));
    };
    document.addEventListener('scroll', alMoverse, { capture: true, passive: true });
    window.addEventListener('resize', alMoverse, { passive: true });
    inject(DestroyRef).onDestroy(() => {
      document.removeEventListener('scroll', alMoverse, { capture: true });
      window.removeEventListener('resize', alMoverse);
    });
  }
}

const ANCHO = 280;
const MARGEN = 12;

/** Debajo del botón y dentro de la pantalla; arriba si no cabe abajo (separado para probarlo) */
export function posicionBurbuja(
  b: { top: number; bottom: number; left: number; width: number },
  anchoVentana: number,
  altoVentana: number,
  altoBurbuja = 120,
): { top: number; left: number } {
  const ancho = Math.min(ANCHO, anchoVentana - 2 * MARGEN);
  const centro = b.left + b.width / 2;
  const left = Math.max(MARGEN, Math.min(centro - ancho / 2, anchoVentana - ancho - MARGEN));
  const abajo = b.bottom + 8;
  const top =
    abajo + altoBurbuja > altoVentana - MARGEN ? Math.max(MARGEN, b.top - 8 - altoBurbuja) : abajo;
  return { top, left };
}
