/** Primera letra (contando tildes, ñ y emojis como una sola) */
const primera = (t: string | null | undefined): string => Array.from((t ?? '').trim())[0] ?? '';

/**
 * Iniciales para el avatar, iguales en toda la aplicación.
 * - Con apellido: primera letra del nombre y del apellido ("Juan Carlos", "Pérez" → "JP").
 * - Solo con el nombre completo (usuarios): primera letra de las dos primeras palabras.
 * Sin nada que mostrar devuelve "?".
 */
export function iniciales(nombre: string | null | undefined, apellido?: string | null): string {
  const r = apellido !== undefined
    ? primera(nombre) + primera(apellido)
    : (nombre ?? '').trim().split(/\s+/).slice(0, 2).map(primera).join('');
  return r.toLocaleUpperCase('es') || '?';
}
