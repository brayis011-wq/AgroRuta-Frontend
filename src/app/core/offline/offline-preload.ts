import { Injectable } from '@angular/core';
import { PreloadingStrategy, Route } from '@angular/router';
import { Observable, catchError, of, switchMap, timer } from 'rxjs';

/**
 * Descarga por adelantado las pantallas que aún no se han abierto, para que el service worker
 * (public/sw.js) las tenga guardadas cuando no haya señal. Solo si el service worker ya controla
 * la página y el teléfono no está en modo de ahorro de datos.
 */
@Injectable({ providedIn: 'root' })
export class PrecargaSinConexion implements PreloadingStrategy {
  preload(_ruta: Route, cargar: () => Observable<unknown>): Observable<unknown> {
    if (typeof navigator === 'undefined' || !navigator.serviceWorker?.controller) return of(null);
    const conexion = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (conexion?.saveData) return of(null);
    // Unos segundos después, para no competir con la pantalla que la persona acaba de abrir
    return timer(4000).pipe(
      switchMap(() => cargar()),
      catchError(() => of(null)),
    );
  }
}

/** Registra el service worker que guarda los archivos de la app (solo en el build de producción). */
export function registrarServiceWorker(produccion: boolean): void {
  if (!produccion || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  });
}
