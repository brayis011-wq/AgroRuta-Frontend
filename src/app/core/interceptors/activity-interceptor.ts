import { HttpInterceptorFn } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { esNuestraApi } from './api-url';

/** Desde cuándo una llamada cuenta como lenta (Render gratis tarda hasta un minuto en despertar) */
export const ESPERA_LENTA_MS = 5000;

/** Llamadas que tardan por naturaleza y avisan por su cuenta: no encienden el aviso de servidor lento */
const TARDAN_POR_NATURALEZA = [
  /\/diagnoses(\/|\?|$)/, // diagnóstico con foto: la IA tarda hasta un minuto y la pantalla ya lo dice
  /\/api\/reports\//,     // los PDF se arman en el servidor
  /\/api\/backups/,       // copias de seguridad
];

/** Cuántas llamadas a nuestro backend están esperando respuesta (lo usa la barra de progreso) */
@Injectable({ providedIn: 'root' })
export class ActividadRedService {
  readonly pendientes = signal(0);
  /** Llamadas que llevan más de ESPERA_LENTA_MS sin respuesta (lo usa el aviso de servidor lento) */
  readonly lentas = signal(0);

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
  let lenta = false;
  const reloj = TARDAN_POR_NATURALEZA.some((r) => r.test(req.url))
    ? null
    : setTimeout(() => { lenta = true; actividad.lentas.update((n) => n + 1); }, ESPERA_LENTA_MS);
  return next(req).pipe(finalize(() => {
    if (reloj) clearTimeout(reloj);
    if (lenta) actividad.lentas.update((n) => Math.max(0, n - 1));
    actividad.terminar();
  }));
};
