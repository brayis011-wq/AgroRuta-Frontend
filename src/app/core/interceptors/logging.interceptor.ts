// src/app/core/interceptors/logging.interceptor.ts
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { tap, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { inject } from '@angular/core';
import { LoggingService } from '../services/logging.service';
import { environment } from '../../../environments/environment';

/**
 * A cada llamada a nuestro backend le pone un X-Trace-Id: el backend lo usa en sus logs (MDC),
 * así un error en la consola del navegador y en el servidor llevan el mismo código.
 * Las llamadas a servicios externos (clima, mapas, traducciones) pasan sin tocar: un header propio
 * haría que el navegador pida permiso (CORS) y algunos de esos servicios lo rechazan.
 */
export const loggingInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url?.startsWith(environment.apiUrl)) return next(req);

  const logger = inject(LoggingService);
  const traceId = crypto.randomUUID().substring(0, 8).toUpperCase();
  const start   = Date.now();

  const tracedReq = req.clone({
    setHeaders: { 'X-Trace-Id': traceId }
  });

  logger.debug(`→ [${traceId}] ${req.method} ${req.url}`);

  return next(tracedReq).pipe(
    tap(() => {
      const ms = Date.now() - start;
      logger.info(`← [${traceId}] ${req.method} ${req.url} (${ms}ms)`);
    }),
    catchError((error: HttpErrorResponse) => {
      const ms = Date.now() - start;
      logger.error(
        `✗ [${traceId}] ${req.method} ${req.url} | status=${error.status} | ${ms}ms`,
        error.error
      );
      return throwError(() => error);
    })
  );
};
