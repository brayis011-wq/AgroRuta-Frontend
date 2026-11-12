import { ChangeDetectionStrategy, Component, DestroyRef, HostListener, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router } from '@angular/router';
import { ActividadRedService } from '../../../core/interceptors/activity-interceptor';

/** Lo que tarda en aparecer: si la respuesta llega antes, la barra ni se muestra */
export const ESPERA_BARRA_MS = 140;

/**
 * Barra fina arriba de la pantalla: avisa que algo está cargando después de un toque o un cambio de página.
 * Las consultas que la app hace sola en segundo plano (clima, pendientes) no la encienden.
 */
@Component({
  selector: 'app-progreso',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="barra" [class.cargando]="estado() === 'cargando'" [class.listo]="estado() === 'listo'" aria-hidden="true"></div>`,
  styles: `
    .barra {
      position: fixed; inset: 0 0 auto 0; height: 3px; z-index: 200; pointer-events: none; opacity: 0;
      transform-origin: left; transform: scaleX(0);
      background: linear-gradient(90deg, var(--ar-verde-600), #6fc276);
      box-shadow: 0 0 10px rgba(46, 125, 50, .45);
    }
    .barra.cargando { opacity: 1; animation: avanzar 9s cubic-bezier(.05, .7, .1, 1) forwards; }
    .barra.listo { opacity: 0; transform: scaleX(1); transition: transform .18s ease-out, opacity .3s .12s ease-out; }
    @keyframes avanzar { from { transform: scaleX(.04); } 30% { transform: scaleX(.6); } to { transform: scaleX(.92); } }
    @media (prefers-reduced-motion: reduce) {
      .barra.cargando { animation: none; transform: scaleX(1); opacity: .7; }
      .barra.listo { transition: opacity .2s; }
    }
  `,
})
export class ProgresoComponent {
  private readonly red = inject(ActividadRedService);
  private readonly navegando = signal(false);
  /** El usuario acaba de tocar algo o de cambiar de página: lo que cargue a partir de ahí sí se muestra */
  private readonly atento = signal(false);
  readonly estado = signal<'oculto' | 'cargando' | 'listo'>('oculto');
  private reloj: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    inject(Router).events.pipe(takeUntilDestroyed()).subscribe((e) => {
      if (e instanceof NavigationStart) {
        this.navegando.set(true);
        this.atento.set(true);
      } else if (e instanceof NavigationEnd || e instanceof NavigationCancel || e instanceof NavigationError) {
        this.navegando.set(false);
      }
    });

    effect(() => {
      const ocupado = this.navegando() || (this.atento() && this.red.pendientes() > 0);
      if (ocupado) this.empezar();
      else this.terminar();
    });
    inject(DestroyRef).onDestroy(() => this.parar());
  }

  @HostListener('document:pointerdown')
  @HostListener('document:keydown')
  alInteractuar(): void {
    this.atento.set(true);
  }

  private empezar(): void {
    if (this.estado() === 'cargando') return;
    if (this.reloj && this.estado() === 'oculto') return;   // ya está por aparecer
    this.parar();
    this.reloj = setTimeout(() => {
      this.reloj = null;
      this.estado.set('cargando');
    }, ESPERA_BARRA_MS);
  }

  private terminar(): void {
    // Nada pendiente: lo siguiente que cargue sin que el usuario toque algo es de segundo plano
    if (this.red.pendientes() === 0) this.atento.set(false);
    if (this.estado() === 'listo') return;   // ya se está despidiendo
    if (this.estado() === 'oculto') {
      this.parar();   // llegó antes de que la barra apareciera
      return;
    }
    this.estado.set('listo');
    this.reloj = setTimeout(() => {
      this.reloj = null;
      this.estado.set('oculto');
    }, 450);
  }

  private parar(): void {
    if (this.reloj) clearTimeout(this.reloj);
    this.reloj = null;
  }
}
