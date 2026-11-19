import { DestroyRef, Injectable, inject } from '@angular/core';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';
import { filter } from 'rxjs';

/** Cuánto se espera a que la página vuelva a tener su alto (los datos llegan del servidor) */
const ESPERA_MAXIMA_MS = 2500;

/** Solo la ruta, sin ?parámetros ni #ancla */
export function soloRuta(url: string): string {
  return url.split(/[?#]/)[0];
}

/**
 * La posición en la página al moverse por la app:
 * - una página nueva empieza arriba (antes podía abrir a media altura, donde iba la anterior);
 * - con "atrás" o "adelante" se vuelve a donde se estaba, esperando a que lleguen los datos;
 * - cambiar solo una pestaña o un filtro (?tab=…) no mueve la página.
 */
@Injectable({ providedIn: 'root' })
export class MemoriaScrollService {
  private readonly router = inject(Router);
  /** Posición de cada entrada del historial (por id de navegación) */
  private readonly posiciones = new Map<number, number>();
  private actualId = 0;
  private anterior = '';
  private volviendoA: number | null = null;
  private espera: ReturnType<typeof setInterval> | null = null;

  iniciar(destroyRef: DestroyRef): void {
    if (typeof window === 'undefined') return;
    try { history.scrollRestoration = 'manual'; } catch { /* navegador viejo */ }

    const sub = this.router.events.pipe(filter((e) => e instanceof NavigationStart || e instanceof NavigationEnd)).subscribe((e) => {
      if (e instanceof NavigationStart) {
        this.posiciones.set(this.actualId, window.scrollY);
        // "atrás"/"adelante": el navegador dice a qué entrada vuelve
        this.volviendoA = e.navigationTrigger === 'popstate' ? (e.restoredState?.navigationId ?? null) : null;
        return;
      }
      const fin = e as NavigationEnd;
      this.actualId = this.volviendoA ?? fin.id;
      const ruta = soloRuta(fin.urlAfterRedirects);
      const cambioDePagina = ruta !== this.anterior;
      this.anterior = ruta;
      if (this.volviendoA != null) this.restaurar(this.posiciones.get(this.volviendoA) ?? 0);
      else if (cambioDePagina) this.arriba();
    });
    destroyRef.onDestroy(() => sub.unsubscribe());
  }

  private arriba(): void {
    this.cancelarEspera();
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }

  /** Vuelve a la posición guardada en cuanto la página es lo bastante alta (o se rinde a los 2,5 s) */
  private restaurar(y: number): void {
    this.cancelarEspera();
    const inicio = Date.now();
    const intentar = () => {
      const alcanza = document.documentElement.scrollHeight - window.innerHeight >= y;
      if (alcanza || Date.now() - inicio > ESPERA_MAXIMA_MS) {
        window.scrollTo({ top: y, behavior: 'instant' as ScrollBehavior });
        this.cancelarEspera();
      }
    };
    intentar();
    if (this.espera === null && window.scrollY !== y) this.espera = setInterval(intentar, 60);
  }

  private cancelarEspera(): void {
    if (this.espera !== null) { clearInterval(this.espera); this.espera = null; }
  }
}
