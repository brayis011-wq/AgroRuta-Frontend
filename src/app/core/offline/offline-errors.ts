import { HttpErrorResponse } from '@angular/common/http';

/** Una petición que no llegó al servidor (status 0: sin señal o sin internet) */
export function esSinRedNoAtendido(error: unknown): boolean {
  return error instanceof HttpErrorResponse && error.status === 0;
}
