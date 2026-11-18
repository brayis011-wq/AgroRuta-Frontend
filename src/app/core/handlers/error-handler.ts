import { ErrorHandler, Injectable } from '@angular/core';

/** Marca en sessionStorage: ya se recargó una vez por una pantalla que no se pudo descargar */
export const CLAVE_RECARGA = 'recargaPorVersion';
const ESPERA_RECARGA_MS = 60_000;

/**
 * ¿Falló la descarga de una pantalla (chunk)? Pasa cuando se publica una versión nueva y la
 * pestaña abierta todavía pide los archivos de la anterior, que ya no existen en el servidor.
 */
export function esFalloDeDescarga(error: unknown): boolean {
  const texto = error instanceof Error ? `${error.name} ${error.message}` : '';
  return /ChunkLoadError|Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed/i.test(texto);
}

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  handleError(error: unknown): void {
    if (error instanceof Error) {
      // El error completo va al final para no perder la pila (dónde ocurrió)
      console.error('Error global capturado:', error.message, error);
      if (esFalloDeDescarga(error)) this.recargarUnaVez();
    } else {
      console.error('Error desconocido:', error);
    }
  }

  /**
   * Recarga la página para traer la versión publicada. Solo si hay conexión (sin señal no serviría)
   * y como mucho una vez por minuto, para no quedar recargando en bucle si el fallo es otro.
   */
  private recargarUnaVez(): void {
    try {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
      const ultima = Number(sessionStorage.getItem(CLAVE_RECARGA) ?? 0);
      if (Date.now() - ultima < ESPERA_RECARGA_MS) return;
      sessionStorage.setItem(CLAVE_RECARGA, String(Date.now()));
      this.recargar();
    } catch {
      // sin almacenamiento no se puede saber si ya se recargó: mejor no insistir
    }
  }

  /** Aparte para poder reemplazarlo en las pruebas */
  protected recargar(): void {
    location.reload();
  }
}
