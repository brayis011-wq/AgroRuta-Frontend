import { HttpInterceptorFn } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { esNuestraApi } from './api-url';

/** Cuántas llamadas a nuestro backend están esperando respuesta (lo usa la barra de progreso) */
@Injectable({ providedIn: 'root' })
export class ActividadRedService {
  readonly pendientes = signal(0);

  empezar(): void {
    this.pendientes.update((n) => n + 1);
  }

  terminar(): void {
    this.pendientes.update((n) => Math.max(0, n - 1));
  }
}

/** Va primero en la cadena: cuenta cada llamada desde que la pide la pantalla hasta que termina o se cancela */
export const actividadInterceptor: HttpInterceptorFn = (req, next) => {
  if (!esNuestraApi(req.url)) return next(req);
  const actividad = inject(ActividadRedService);
  actividad.empezar();
  return next(req).pipe(finalize(() => actividad.terminar()));
};
