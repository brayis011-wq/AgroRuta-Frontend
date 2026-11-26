/**
 * Rutas del API de las que nunca se guarda copia, ni en la caché de memoria (10 s) ni en el dispositivo
 * para usar sin conexión: sesión, seguridad, administración, copias de respaldo, verificación pública
 * y suscripciones a notificaciones.
 */
export const SIN_COPIA: readonly string[] = [
  '/api/auth/',
  '/api/admin',
  '/api/backups',
  '/api/configuration/security',
  '/api/public/',
  '/api/push',
];

/**
 * La caché de memoria tampoco guarda el resto de la configuración: un cambio de preferencias debe verse
 * enseguida. Sin conexión sí se sirve la última copia, para que la aplicación abra con el idioma y el tema.
 */
// La campana tampoco: un aviso recién marcado como leído no debe volver a salir sin leer por una copia de hace segundos
export const SIN_COPIA_EN_MEMORIA: readonly string[] = [
  ...SIN_COPIA,
  '/api/configuration',
  '/api/notifications/inbox',
];

/** true si la ruta ("/api/...", sin el dominio) empieza por alguna de la lista */
export function sinCopia(ruta: string, lista: readonly string[]): boolean {
  return lista.some((p) => ruta.startsWith(p));
}
