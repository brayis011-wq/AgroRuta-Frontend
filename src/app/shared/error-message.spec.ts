import { HttpErrorResponse } from '@angular/common/http';
import { estadoHttp, mensajeDeError, mensajeDelServidor } from './error-message';

describe('mensajes de error del backend', () => {
  const conMensaje = new HttpErrorResponse({
    status: 409,
    error: { message: 'La nómina ya está pagada.' },
  });

  it('usa el message que explica el servidor', () => {
    expect(mensajeDeError(conMensaje, 'respaldo')).toBe('La nómina ya está pagada.');
    expect(mensajeDelServidor(conMensaje)).toBe('La nómina ya está pagada.');
  });

  it('usa el respaldo si no hay message, viene vacío o no es texto', () => {
    expect(mensajeDeError(new HttpErrorResponse({ status: 0 }), 'sin.red')).toBe('sin.red');
    expect(mensajeDeError({ error: { message: '  ' } }, 'r')).toBe('r');
    expect(mensajeDeError({ error: { message: 42 } }, 'r')).toBe('r');
    expect(mensajeDeError(null, 'r')).toBe('r');
    expect(mensajeDelServidor('texto')).toBeNull();
  });

  it('lee el código HTTP o 0', () => {
    expect(estadoHttp(conMensaje)).toBe(409);
    expect(estadoHttp(new Error('x'))).toBe(0);
  });
});
