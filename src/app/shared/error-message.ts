/**
 * Mensajes de error del backend. El GlobalExceptionHandler responde { message, errorCode, ... }
 * y las pantallas muestran ese message (en español) o, si no viene, un texto de respaldo.
 */

/** El message que explica el servidor, o null si la respuesta no trae uno (sin red, 500 genérico...). */
export function mensajeDelServidor(err: unknown): string | null {
  if (typeof err !== 'object' || err === null || !('error' in err)) return null;
  const cuerpo = (err as { error?: unknown }).error;
  if (typeof cuerpo !== 'object' || cuerpo === null || !('message' in cuerpo)) return null;
  const mensaje = (cuerpo as { message?: unknown }).message;
  return typeof mensaje === 'string' && mensaje.trim() ? mensaje : null;
}

/** El message del servidor o el respaldo (una clave de traducción o un texto ya traducido). */
export function mensajeDeError(err: unknown, respaldo: string): string {
  return mensajeDelServidor(err) ?? respaldo;
}

/** El código HTTP del error, o 0 si no es una respuesta HTTP. */
export function estadoHttp(err: unknown): number {
  if (typeof err !== 'object' || err === null || !('status' in err)) return 0;
  const estado = (err as { status?: unknown }).status;
  return typeof estado === 'number' ? estado : 0;
}
