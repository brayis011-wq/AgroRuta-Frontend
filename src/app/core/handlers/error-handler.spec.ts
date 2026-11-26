// src/app/core/handlers/error-handler.spec.ts
import { vi } from 'vitest';
import { CLAVE_RECARGA, GlobalErrorHandler, esFalloDeDescarga } from './error-handler';

/** Igual que el real, pero cuenta las recargas en vez de recargar la página de la prueba */
class ManejadorDePrueba extends GlobalErrorHandler {
  recargas = 0;
  protected override recargar(): void {
    this.recargas++;
  }
}

describe('GlobalErrorHandler', () => {
  let handler: ManejadorDePrueba;

  beforeEach(() => {
    handler = new ManejadorDePrueba();
    sessionStorage.removeItem(CLAVE_RECARGA);
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => vi.restoreAllMocks());

  it('should create the handler', () => {
    expect(handler).toBeTruthy();
  });

  it('should log message and the error itself when error is an instance of Error', () => {
    const error = new Error('Test error');
    handler.handleError(error);
    expect(console.error).toHaveBeenCalledWith('Error global capturado:', 'Test error', error);
    expect(handler.recargas).toBe(0);
  });

  it('should log unknown error when error is not an instance of Error', () => {
    const error = { code: 500, detail: 'something went wrong' };
    handler.handleError(error);
    expect(console.error).toHaveBeenCalledWith('Error desconocido:', error);
  });

  it('should handle null as unknown error', () => {
    handler.handleError(null);
    expect(console.error).toHaveBeenCalledWith('Error desconocido:', null);
  });

  it('should handle string as unknown error', () => {
    handler.handleError('simple string error');
    expect(console.error).toHaveBeenCalledWith('Error desconocido:', 'simple string error');
  });

  it('reconoce el fallo al descargar una pantalla de una versión que ya no existe', () => {
    expect(
      esFalloDeDescarga(
        new TypeError('Failed to fetch dynamically imported module: https://x/chunk-ABC.js'),
      ),
    ).toBe(true);
    expect(
      esFalloDeDescarga(
        new Error('Uncaught (in promise): TypeError: error loading dynamically imported module'),
      ),
    ).toBe(true);
    expect(esFalloDeDescarga(new Error('Cannot read properties of undefined'))).toBe(false);
    expect(esFalloDeDescarga('Failed to fetch dynamically imported module')).toBe(false);
  });

  it('recarga una sola vez cuando no se puede descargar una pantalla', () => {
    const fallo = new TypeError(
      'Failed to fetch dynamically imported module: https://x/chunk-ABC.js',
    );
    handler.handleError(fallo);
    handler.handleError(fallo);
    expect(handler.recargas).toBe(1);
  });

  it('no recarga si no hay conexión', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    handler.handleError(
      new TypeError('Failed to fetch dynamically imported module: https://x/chunk-ABC.js'),
    );
    expect(handler.recargas).toBe(0);
  });
});
