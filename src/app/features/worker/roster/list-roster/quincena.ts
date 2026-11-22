/** Una quincena: del 1 al 15 o del 16 al último día del mes (fechas aaaa-mm-dd) */
export interface Quincena { inicio: string; fin: string }

const iso = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

/** La quincena en la que cae el día */
export function quincenaActual(hoy: Date): Quincena {
  const y = hoy.getFullYear(), m = hoy.getMonth();
  if (hoy.getDate() <= 15) return { inicio: iso(y, m, 1), fin: iso(y, m, 15) };
  return { inicio: iso(y, m, 16), fin: iso(y, m, new Date(y, m + 1, 0).getDate()) };
}

/** La última quincena que ya terminó (la que normalmente se paga) */
export function quincenaAnterior(hoy: Date): Quincena {
  const y = hoy.getFullYear(), m = hoy.getMonth();
  if (hoy.getDate() > 15) return { inicio: iso(y, m, 1), fin: iso(y, m, 15) };
  const anterior = new Date(y, m, 0); // último día del mes anterior
  return { inicio: iso(anterior.getFullYear(), anterior.getMonth(), 16), fin: iso(anterior.getFullYear(), anterior.getMonth(), anterior.getDate()) };
}
