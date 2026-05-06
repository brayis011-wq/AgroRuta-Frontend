// src/app/core/interceptors/logging.interceptor.ts
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { tap, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { inject } from '@angular/core';
import { LoggingService } from '../services/logging.service';

export const loggingInterceptor: HttpInterceptorFn = (req, next) => {
  const logger = inject(LoggingService);
  const traceId = crypto.randomUUID().substring(0, 8).toUpperCase();
  const start   = Date.now();

  // Propagar traceId al backend
  const tracedReq = req.clone({
    setHeaders: { 'X-Trace-Id': traceId }
  });

  logger.debug(`→ [${traceId}] ${req.method} ${req.url}`);

  return next(tracedReq).pipe(
    tap(event => {
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
