import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, catchError, from, map, of, switchMap, tap, throwError, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import { esNuestraApi } from '../interceptors/api-url';
import { SIN_COPIA, sinCopia } from '../interceptors/rutas-sin-copia';
import { CABECERA_ENVIO, ColaSinConexionService, SIN_COLA } from './offline-queue.service';
import { TipoPendiente } from './offline-store';

/**
 * Lo que se puede registrar sin señal: registros nuevos de campo y de dinero, que no dependen de
 * una respuesta para seguir trabajando. Editar o borrar sí necesita conexión.
 */
const EN_COLA: readonly { metodo: 'POST' | 'PUT'; ruta: RegExp; tipo: TipoPendiente }[] = [
  { metodo: 'POST', ruta: /^\/api\/workdays$/, tipo: 'jornal' },
  { metodo: 'POST', ruta: /^\/api\/workdays\/batch$/, tipo: 'planilla' },
  { metodo: 'POST', ruta: /^\/api\/sprayings$/, tipo: 'fumigacion' },
  { metodo: 'POST', ruta: /^\/api\/harvests$/, tipo: 'cosecha' },
  { metodo: 'POST', ruta: /^\/api\/activities$/, tipo: 'actividad' },
  { metodo: 'POST', ruta: /^\/api\/sales$/, tipo: 'venta' },
  { metodo: 'POST', ruta: /^\/api\/sales\/\d+\/payments$/, tipo: 'abono' },
  { metodo: 'POST', ruta: /^\/api\/farm-expenses$/, tipo: 'gasto' },
  { metodo: 'POST', ruta: /^\/api\/inventory\/purchases$/, tipo: 'compra' },
  { metodo: 'PUT', ruta: /^\/api\/farms\/\d+\/rain\/\d{4}-\d{2}-\d{2}$/, tipo: 'lluvia' },
];

/** Qué tipo de registro es esa petición, si se puede guardar sin señal */
export function tipoEnCola(metodo: string, ruta: string): TipoPendiente | null {
  return EN_COLA.find((c) => c.metodo === metodo && c.ruta.test(ruta))?.tipo ?? null;
}

/**
 * Si el servidor no contesta un registro en este tiempo (señal muy débil), se guarda en el dispositivo
 * en vez de dejar a la persona esperando. No se duplica: el reenvío lleva la misma clave y el servidor
 * reconoce la segunda vez que llega.
 */
export const ESPERA_REGISTRO_MS = 20_000;

// Las consultas que no se copian al dispositivo están en interceptors/rutas-sin-copia.ts

const sinRed = (e: unknown) => e instanceof HttpErrorResponse && e.status === 0;

function claveNueva(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}-${Math.random().toString(36).slice(2, 12)}`;
}

/**
 * Modo sin conexión. Va primero en la cadena para ver el resultado final de cada petición:
 * - Consultas (GET) a nuestra API: guarda una copia de la respuesta y la devuelve si no hay red.
 * - Registrar sin red (o sin respuesta en 20 s) un jornal, la planilla, una fumigación, cosecha,
 *   actividad, venta, abono, gasto, compra de la bodega o la lluvia del día: lo guarda en el dispositivo
 *   y responde 202 con `{ pendiente: true }`; la cola lo envía cuando vuelve la señal.
 * Todo lo demás pasa igual (y falla igual) que siempre.
 */
export const sinConexionInterceptor: HttpInterceptorFn = (req, next) => {
  if (!esNuestraApi(req.url)) return next(req);
  const ruta = req.url.slice(environment.apiUrl.length);
  // La sesión (login, renovar) pasa sin tocar la cola: la cola depende del servicio de sesión
  if (ruta.startsWith('/api/auth/')) return next(req);
  const cola = inject(ColaSinConexionService);
  // Cada respuesta dice si hay conexión de verdad: el indicador no depende solo de lo que diga el teléfono
  const vigilar = <T>(peticion: Observable<T>): Observable<T> =>
    peticion.pipe(
      tap((evento) => {
        if (evento instanceof HttpResponse) cola.marcarRed(true);
      }),
      catchError((e: unknown) => {
        if (e instanceof HttpErrorResponse) cola.marcarRed(e.status !== 0);
        return throwError(() => e);
      }),
    );

  const tipo = req.method === 'POST' || req.method === 'PUT' ? tipoEnCola(req.method, ruta) : null;
  if (tipo) {
    if (req.context.get(SIN_COLA)) return vigilar(next(req));

    const clave = claveNueva();
    const metodo = req.method as 'POST' | 'PUT';
    const guardarAqui = (original?: unknown) =>
      from(cola.encolar(tipo, req.url, req.body, clave, metodo)).pipe(
        map(
          () =>
            new HttpResponse({
              status: 202,
              statusText: 'Accepted',
              url: req.url,
              body: { pendiente: true },
            }),
        ),
        // No se pudo guardar en el dispositivo: que la pantalla muestre el error de siempre
        catchError((e) => throwError(() => original ?? e)),
      );

    if (!cola.enLinea()) return guardarAqui(new HttpErrorResponse({ status: 0, url: req.url }));
    // La clave viaja también en el primer intento: si la respuesta se pierde y se reenvía, no se duplica
    return vigilar(next(req.clone({ setHeaders: { [CABECERA_ENVIO]: clave } }))).pipe(
      // Señal tan débil que no llega la respuesta: se guarda en el dispositivo y se reenvía después
      timeout({ each: ESPERA_REGISTRO_MS, with: () => guardarAqui() }),
      catchError((error: unknown) =>
        sinRed(error) ? guardarAqui(error) : throwError(() => error),
      ),
    );
  }

  if (req.method === 'GET' && req.responseType === 'json' && !sinCopia(ruta, SIN_COPIA)) {
    return vigilar(next(req)).pipe(
      tap((evento) => {
        if (evento instanceof HttpResponse && evento.ok)
          cola.guardarLectura(req.urlWithParams, evento.body);
      }),
      catchError((error: unknown) =>
        sinRed(error)
          ? from(cola.leerLectura(req.urlWithParams)).pipe(
              switchMap((copia) =>
                copia
                  ? of(
                      new HttpResponse({
                        status: 200,
                        statusText: 'OK',
                        url: req.urlWithParams,
                        body: copia.valor,
                      }),
                    )
                  : throwError(() => error),
              ),
            )
          : throwError(() => error),
      ),
    );
  }

  return vigilar(next(req));
};
