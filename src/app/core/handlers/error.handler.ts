import { ErrorHandler, Injectable } from '@angular/core';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  handleError(error: unknown): void {
    if (error instanceof Error) {
      console.error('Error global capturado:', error.message);
    } else {
      console.error('Error desconocido:', error);
    }
  }
}
