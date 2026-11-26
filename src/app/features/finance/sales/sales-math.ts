/** Cuentas de las ventas, sin pantalla: las mismas reglas que valida el backend. */

const redondear2 = (n: number) => Math.round(n * 100) / 100;

/** Kilos × precio cuando están los dos; si no, el total escrito. */
export function totalVenta(
  cantidadKg: number | null | undefined,
  precioKg: number | null | undefined,
  totalEscrito: number | null,
): number | null {
  if (cantidadKg && precioKg) return Math.round(cantidadKg * precioKg);
  return totalEscrito;
}

/**
 * Lo que queda por vender de una siembra: lo cosechado menos lo vendido, más los kilos que ya tenía
 * la venta que se está editando (si es de esa misma siembra).
 */
export function kilosQueQuedan(
  kgCosechados: number,
  kgVendidos: number,
  kgPropios: number,
): number {
  return Math.max(0, redondear2(kgCosechados - kgVendidos + kgPropios));
}

/**
 * Los kilos escritos pasan de lo que queda. Al editar una venta de antes que ya pasaba, bajar o dejar
 * igual los kilos sí se puede. Se tolera medio gramo por redondeo.
 */
export function pasaDeLoQueQueda(
  kgEscritos: number,
  quedan: number | null,
  kgOriginalesMismaSiembra: number | null,
): boolean {
  if (kgOriginalesMismaSiembra && kgEscritos <= kgOriginalesMismaSiembra) return false;
  return quedan == null || kgEscritos > quedan + 0.004;
}

/** Lo que queda de cada calidad, sumado (para "Solo primera"...). */
export function sumarPorCalidad(
  cosechas: { calidad: string; quedan: number }[],
): { calidad: string; kg: number }[] {
  const suma = new Map<string, number>();
  for (const c of cosechas) suma.set(c.calidad, (suma.get(c.calidad) ?? 0) + c.quedan);
  return [...suma.entries()].map(([calidad, kg]) => ({ calidad, kg: redondear2(kg) }));
}

/** Días que lleva vencida una venta que quedó de pagar en "yyyy-MM-dd" (0 si no ha vencido). */
export function diasVencida(vence: string | null | undefined, ahora = Date.now()): number {
  if (!vence) return 0;
  const [y, m, d] = vence.split('-').map(Number);
  return Math.max(0, Math.round((ahora - new Date(y, m - 1, d).getTime()) / 86_400_000));
}
