/** Lo mínimo de una cosecha para saber cuánto queda de ella por vender */
export interface CosechaKilos {
  id?: number;
  fecha: string;
  cantidadKg: number;
}

/**
 * Cuántos kilos quedan por vender de cada cosecha. Lo vendido de una siembra no dice de qué cosecha salió,
 * así que se descuenta de las más viejas primero (lo primero que se recoge es lo primero que se vende).
 * Devuelve los kilos que quedan por id de cosecha (0 = ya vendida toda).
 */
export function quedanPorCosecha(
  cosechas: CosechaKilos[],
  kgVendidos: number,
): Map<number, number> {
  const orden = [...cosechas].sort(
    (a, b) => a.fecha.localeCompare(b.fecha) || (a.id ?? 0) - (b.id ?? 0),
  );
  let porDescontar = Math.max(0, kgVendidos || 0);
  const quedan = new Map<number, number>();
  for (const c of orden) {
    const kg = Number(c.cantidadKg) || 0;
    const vendido = Math.min(kg, porDescontar);
    porDescontar -= vendido;
    if (c.id != null) quedan.set(c.id, Math.round((kg - vendido) * 100) / 100);
  }
  return quedan;
}
