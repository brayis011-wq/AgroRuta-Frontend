import { CostosSiembra } from '../../../core/models/cultivo.model';
import { CropDetail } from '../../../core/services/report.service';

export interface FilaCostos {
  siembra: CropDetail;
  costos: CostosSiembra | null;
}

export interface TotalesCostos {
  temporadas: number;
  costo: number;
  ingresos: number;
  /** null si ninguna temporada tiene precio de venta */
  ganancia: number | null;
  kg: number;
  /** null sin kilos cosechados */
  costoPorKg: number | null;
  conDatos: number;
}

/** Suma de todas las temporadas con costos cargados */
export function totalesCostos(filas: FilaCostos[]): TotalesCostos {
  const con = filas.filter((f) => f.costos);
  const costo = con.reduce((s, f) => s + f.costos!.costoTotal, 0);
  const ingresos = con.reduce((s, f) => s + f.costos!.ingresos, 0);
  const conPrecio = con.some((f) => f.costos!.kgConPrecio > 0);
  const kg = con.reduce((s, f) => s + f.costos!.kgTotal, 0);
  return {
    temporadas: filas.length,
    costo, ingresos,
    ganancia: conPrecio ? ingresos - costo : null,
    kg,
    costoPorKg: kg > 0 ? costo / kg : null,
    conDatos: con.filter((f) => f.costos!.costoTotal > 0 || f.costos!.ingresos > 0).length,
  };
}

export type OrdenCostos = 'reciente' | 'costo' | 'ganancia';

export function ordenarCostos(filas: FilaCostos[], orden: OrdenCostos, texto: string): FilaCostos[] {
  const q = texto.trim().toLowerCase();
  const visibles = q
    ? filas.filter((f) => [f.siembra.cultivo, f.siembra.variedad, f.siembra.loteNombre, f.siembra.fincaNombre]
        .some((v) => (v ?? '').toLowerCase().includes(q)))
    : filas;
  const valor = (f: FilaCostos) =>
    orden === 'costo' ? f.costos?.costoTotal ?? -1 : f.costos?.ganancia ?? Number.NEGATIVE_INFINITY;
  return [...visibles].sort((a, b) =>
    orden === 'reciente'
      ? (b.siembra.fechaSiembra ?? '').localeCompare(a.siembra.fechaSiembra ?? '')
      : valor(b) - valor(a));
}
