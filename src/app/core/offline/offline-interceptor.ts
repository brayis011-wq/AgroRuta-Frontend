import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, map, of, switchMap, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { esNuestraApi } from '../interceptors/api-url';
import { CABECERA_ENVIO, ColaSinConexionService, SIN_COLA } from './offline-queue.service';
import { TipoPendiente } from './offline-store';

/** Lo único que se puede registrar sin señal: registros nuevos de campo, que no dependen de una respuesta */
const EN_COLA: Record<string, TipoPendiente> = {
  '/api/workdays': 'jornal',
  '/api/sprayings': 'fumigacion',
  '/api/harvests': 'cosecha',
  '/api/activities': 'actividad',
};

/** Consultas que no se copian al dispositivo: sesión, seguridad, administración y verificación pública */
const SIN_COPIA = ['/api/auth/', '/api/admin', '/api/backups', '/api/configuration/security', '/api/public/'];

const sinRed = (e: unknown) => e instanceof HttpErrorResponse && e.status === 0;

function claveNueva(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}-${Math.random().toString(36).slice(2, 12)}`;
}

/**
 * Modo sin conexión. Va primero en la cadena para ver el resultado final de cada petición:
 * - Consultas (GET) a nuestra API: guarda una copia de la respuesta y la devuelve si no hay red.
 * - Registrar un jornal, fumigación, cosecha o actividad sin red: lo guarda en el dispositivo y
 *   responde 202 con `{ pendiente: true }`; la cola lo envía cuando vuelve la señal.
 * Todo lo demás pasa igual (y falla igual) que siempre.
 */
export const sinConexionInterceptor: HttpInterceptorFn = (req, next) => {
  if (!esNuestraApi(req.url)) return next(req);
  const ruta = req.url.slice(environment.apiUrl.length);

  if (req.method === 'POST') {
    const tipo = EN_COLA[ruta];
    if (!tipo || req.context.get(SIN_COLA)) return next(req);

    const cola = inject(ColaSinConexionService);
    const clave = claveNueva();
    const guardarAqui = (original?: unknown) =>
      from(cola.encolar(tipo, req.url, req.body, clave)).pipe(
        map(() => new HttpResponse({ status: 202, statusText: 'Accepted', url: req.url, body: { pendiente: true } })),
        // No se pudo guardar en el dispositivo: que la pantalla muestre el error de siempre
        catchError((e) => throwError(() => original ?? e)),
      );

    if (!cola.enLinea()) return guardarAqui(new HttpErrorResponse({ status: 0, url: req.url }));
    // La clave viaja también en el primer intento: si la respuesta se pierde y se reenvía, no se duplica
    return next(req.clone({ setHeaders: { [CABECERA_ENVIO]: clave } })).pipe(
      catchError((error: unknown) => (sinRed(error) ? guardarAqui(error) : throwError(() => error))),
    );
  }

  if (req.method === 'GET' && req.responseType === 'json' && !SIN_COPIA.some((p) => ruta.startsWith(p))) {
    const cola = inject(ColaSinConexionService);
    return next(req).pipe(
      tap((evento) => {
        if (evento instanceof HttpResponse && evento.ok) cola.guardarLectura(req.urlWithParams, evento.body);
      }),
      catchError((error: unknown) =>
        sinRed(error)
          ? from(cola.leerLectura(req.urlWithParams)).pipe(
              switchMap((copia) =>
                copia
                  ? of(new HttpResponse({ status: 200, statusText: 'OK', url: req.urlWithParams, body: copia.valor }))
                  : throwError(() => error),
              ),
            )
          : throwError(() => error),
      ),
    );
  }

  return next(req);
};
