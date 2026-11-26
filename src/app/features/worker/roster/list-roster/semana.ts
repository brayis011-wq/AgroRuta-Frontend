/** Una semana de nómina: de lunes a domingo (fechas aaaa-mm-dd) */
export interface Semana {
  inicio: string;
  fin: string;
}

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** La semana (lunes a domingo) en la que cae el día */
export function semanaActual(hoy: Date): Semana {
  const lunes = new Date(
    hoy.getFullYear(),
    hoy.getMonth(),
    hoy.getDate() - ((hoy.getDay() + 6) % 7),
  );
  const domingo = new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() + 6);
  return { inicio: iso(lunes), fin: iso(domingo) };
}

/** La semana anterior a la del día */
export function semanaAnterior(hoy: Date): Semana {
  return semanaActual(new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 7));
}

/**
 * La semana que normalmente se paga: el viernes, sábado o domingo se paga la que está terminando;
 * de lunes a jueves, la anterior (ya terminada).
 */
export function semanaParaPagar(hoy: Date): Semana {
  return hoy.getDay() === 0 || hoy.getDay() >= 5 ? semanaActual(hoy) : semanaAnterior(hoy);
}
