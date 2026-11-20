/**
 * Atajos de teclado del computador (no se usan mientras se escribe en un campo):
 *   /        buscar
 *   N        nuevo, según la pantalla (un registro en la siembra, un trabajador en Equipo...)
 *   G y I    ir al Inicio; G y C, Cultivos; G y E, Equipo; G y J, Jornales; G y N, Nóminas; G y R, Reportes
 *   ?        ver esta lista
 */
export interface Atajo { teclas: string[]; clave: string }

export const ATAJOS: Atajo[] = [
  { teclas: ['/'], clave: 'shortcuts.search' },
  { teclas: ['N'], clave: 'shortcuts.new' },
  { teclas: ['G', 'I'], clave: 'shortcuts.home' },
  { teclas: ['G', 'C'], clave: 'shortcuts.crops' },
  { teclas: ['G', 'E'], clave: 'shortcuts.team' },
  { teclas: ['G', 'J'], clave: 'shortcuts.wages' },
  { teclas: ['G', 'N'], clave: 'shortcuts.payrolls' },
  { teclas: ['G', 'R'], clave: 'shortcuts.reports' },
  { teclas: ['?'], clave: 'shortcuts.help' },
];

/** A dónde lleva "G" seguida de cada letra */
export const IR_A: Record<string, string> = {
  i: '/dashboard', c: '/crops', e: '/worker', j: '/worker/workdays', n: '/worker/payrolls', r: '/reports',
};

/** Qué abre "N" en cada pantalla (la más parecida a la dirección actual) */
export function nuevoSegun(ruta: string): { ruta: (string | number)[]; query?: Record<string, string> } {
  const siembra = /^\/crops\/planting\/(\d+)$/.exec(ruta);
  if (siembra) return { ruta: ['/crops/planting', Number(siembra[1]), 'activity'] };
  const finca = /^\/crops\/farm\/(\d+)$/.exec(ruta);
  if (finca) return { ruta: ['/crops/farm', Number(finca[1]), 'new-plot'] };
  if (ruta === '/crops') return { ruta: ['/crops/new-farm'] };
  if (ruta === '/crops/inventory') return { ruta: ['/crops/inventory'], query: { compra: '1' } };
  if (ruta === '/worker') return { ruta: ['/worker'], query: { nuevo: '1' } };
  return { ruta: ['/worker/workdays/new'] };
}

/** Se está escribiendo: los atajos no deben robar la tecla */
export function escribiendoEn(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName);
}
