import { HttpContextToken, HttpEvent, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { Observable, filter, finalize, map, of, share, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { esNuestraApi } from './api-url';

/** Para una consulta que siempre debe ir al servidor: `context: new HttpContext().set(SIN_CACHE, true)` */
export const SIN_CACHE = new HttpContextToken<boolean>(() => false);

/** Cuánto sirve una respuesta guardada. Corto a propósito: es para ir y volver entre pantallas, no para trabajar con datos viejos. */
export const VIDA_CACHE_MS = 20_000;
const MAXIMO = 150;

/** Sesión, seguridad, configuración y administración siempre se consultan de nuevo */
const SIN_COPIA = ['/api/auth/', '/api/admin', '/api/backups', '/api/configuration', '/api/public/', '/api/push'];

interface Copia { hasta: number; respuesta: HttpResponse<unknown>; }

const copias = new Map<string, Copia>();
const enVuelo = new Map<string, Observable<HttpEvent<unknown>>>();
/** Cambia cada vez que se guarda algo: una consulta que salió antes ya no se guarda */
let epoca = 0;

export function vaciarCacheBreve(): void {
  copias.clear();
  enVuelo.clear();
  epoca++;
}

/** Cada pantalla recibe su propia copia: si una ordena o cambia la lista, no daña la guardada */
function copiar<T>(cuerpo: T): T {
  if (cuerpo === null || typeof cuerpo !== 'object') return cuerpo;
  return typeof structuredClone === 'function' ? structuredClone(cuerpo) : JSON.parse(JSON.stringify(cuerpo));
}

function guardar(clave: string, respuesta: HttpResponse<unknown>): void {
  const ahora = Date.now();
  if (copias.size >= MAXIMO) {
    for (const [k, c] of copias) if (c.hasta <= ahora) copias.delete(k);
    // Si aún no cabe, sale la más antigua (el Map conserva el orden en que se guardaron)
    while (copias.size >= MAXIMO) copias.delete(copias.keys().next().value as string);
  }
  copias.set(clave, { hasta: ahora + VIDA_CACHE_MS, respuesta });
}

/**
 * Memoria breve de consultas, para que ir y volver entre pantallas sea inmediato:
 * - Una consulta repetida en menos de 20 segundos se responde con lo que ya se trajo.
 * - Dos pantallas que piden lo mismo a la vez comparten una sola llamada.
 * - Cualquier cambio (crear, editar, borrar) vacía todo: nunca se muestra un dato viejo después de guardar.
 * Las copias van atadas al token de la sesión, así que no pasan de un usuario a otro. Va después del
 * interceptor del token (necesita la cabecera Authorization) y vive solo en memoria.
 */
export const cacheBreveInterceptor: HttpInterceptorFn = (req, next) => {
  if (!esNuestraApi(req.url)) return next(req);

  if (req.method !== 'GET') {
    vaciarCacheBreve();
    // Al terminar se vacía otra vez, por las consultas que salieron mientras se guardaba
    return next(req).pipe(finalize(vaciarCacheBreve));
  }

  const ruta = req.url.slice(environment.apiUrl.length);
  const sesion = req.headers.get('Authorization');
  if (!sesion || req.responseType !== 'json' || req.context.get(SIN_CACHE) || SIN_COPIA.some((p) => ruta.startsWith(p))) {
    return next(req);
  }

  const clave = `${sesion} ${req.urlWithParams}`;
  const copia = copias.get(clave);
  if (copia && copia.hasta > Date.now()) {
    return of(copia.respuesta.clone({ body: copiar(copia.respuesta.body) }));
  }

  let vuelo = enVuelo.get(clave);
  if (!vuelo) {
    const alSalir = epoca;
    const mio: Observable<HttpEvent<unknown>> = next(req).pipe(
      filter((e): e is HttpResponse<unknown> => e instanceof HttpResponse),
      tap((r) => {
        if (alSalir === epoca && r.ok) guardar(clave, r);
      }),
      finalize(() => {
        if (enVuelo.get(clave) === mio) enVuelo.delete(clave);
      }),
      share(),
    );
    vuelo = mio;
    enVuelo.set(clave, mio);
  }
  return vuelo.pipe(map((e) => (e instanceof HttpResponse ? e.clone({ body: copiar(e.body) }) : e)));
};
