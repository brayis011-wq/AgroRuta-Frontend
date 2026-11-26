import { MeasurementUnit } from '../../../../core/models/agricultural-input.model';

/** Cuántas unidades base (ml o g) hay en cada unidad */
const FACTOR_BASE: Record<MeasurementUnit, number> = { LITROS: 1000, ML: 1, KG: 1000, GRAMOS: 1 };

/** Sin tildes ni mayúsculas, para que "fungicida" encuentre "Fungicída" */
export function normalizar(t: string | null | undefined): string {
  return (t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/** Pasa una cantidad de una unidad a otra del mismo tipo (litros↔ml, kilos↔gramos), con 3 decimales. */
export function convertirCantidad(
  cantidad: number,
  de: MeasurementUnit,
  a: MeasurementUnit,
): number {
  return Math.round(((cantidad * FACTOR_BASE[de]) / FACTOR_BASE[a]) * 1000) / 1000;
}

/** El producto aparece al buscar por su nombre, su tipo ("FUNGICIDA") o el tipo traducido ("Fungicida"). */
export function coincideBusqueda(
  texto: string,
  nombre: string,
  tipo: string,
  tipoTraducido: string,
): boolean {
  const q = normalizar(texto);
  if (!q) return true;
  return (
    normalizar(nombre).includes(q) ||
    normalizar(tipo).includes(q) ||
    (!!tipo && normalizar(tipoTraducido).includes(q))
  );
}

/** Agrupa por la clave del tipo (no por el nombre traducido) y ordena los grupos por su nombre traducido. */
export function agruparPorTipo<T>(
  items: T[],
  tipoDe: (item: T) => string,
  etiqueta: (tipo: string) => string,
): { tipo: string; items: T[] }[] {
  const grupos = new Map<string, T[]>();
  for (const item of items) {
    const tipo = tipoDe(item);
    if (!grupos.has(tipo)) grupos.set(tipo, []);
    grupos.get(tipo)!.push(item);
  }
  return [...grupos.entries()]
    .map(([tipo, lista]) => ({ tipo, items: lista }))
    .sort((a, b) => etiqueta(a.tipo).localeCompare(etiqueta(b.tipo)));
}

const CLASE_POR_TIPO: Record<string, string> = {
  FUNGICIDA: 'badge-fungicida',
  INSECTICIDA: 'badge-insecticida',
  ACARICIDA: 'badge-acaricida',
  NEMATICIDA: 'badge-nematicida',
  HERBICIDA: 'badge-herbicida',
  FERTILIZANTE_FOLIAR: 'badge-fertilizante',
  FERTILIZANTE_SUELO: 'badge-fertilizante-suelo',
  REGULADOR_CRECIMIENTO: 'badge-regulador',
  COADYUVANTE: 'badge-coadyuvante',
};

/** Clase CSS de la etiqueta de color de cada tipo de producto */
export function claseDeTipo(tipo: string): string {
  return CLASE_POR_TIPO[tipo] ?? 'badge-default';
}
