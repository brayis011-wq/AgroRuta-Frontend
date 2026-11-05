import { ResumenSiembra, SemanaCosecha, TemporadaComparada } from '../../../../core/models/cultivo.model';

export interface BarraSemana {
  semana: string;
  total: number;
  /** Alto de cada calidad en % del máximo de la gráfica */
  primera: number;
  segunda: number;
  tercera: number;
  datos: SemanaCosecha;
}

/** Barras apiladas por semana, escaladas a la semana con más kilos */
export function barrasSemanas(semanas: SemanaCosecha[]): BarraSemana[] {
  const max = Math.max(0, ...semanas.map(totalSemana));
  const pct = (v: number) => (max > 0 ? (v / max) * 100 : 0);
  return semanas.map((s) => ({
    semana: s.semana,
    total: totalSemana(s),
    primera: pct(s.primera),
    segunda: pct(s.segunda),
    tercera: pct(s.tercera),
    datos: s,
  }));
}

export function totalSemana(s: SemanaCosecha): number {
  return s.primera + s.segunda + s.tercera;
}

/** Porcentaje de cada calidad sobre el total */
export function partesCalidad(r: Pick<ResumenSiembra, 'kgPrimera' | 'kgSegunda' | 'kgTercera' | 'totalKg'>) {
  const t = r.totalKg || 0;
  const p = (v: number) => (t > 0 ? Math.round((v / t) * 100) : 0);
  return { primera: p(r.kgPrimera), segunda: p(r.kgSegunda), tercera: p(r.kgTercera) };
}

export interface FilaComparacion {
  id: number;
  nombre: string;
  desde: string;
  hasta: string | null;
  kg: number;
  kgPorPlanta: number | null;
  /** Ancho de la barra en % del máximo */
  ancho: number;
  actual: boolean;
  enCurso: boolean;
}

/**
 * Esta temporada y las anteriores del mismo cultivo en el lote, de la más reciente a la más vieja.
 * Se comparan por kg por planta cuando todas lo tienen; si no, por kg totales.
 */
export function comparacion(r: ResumenSiembra, actual: { id: number; nombre: string; desde: string; plantas: number }):
  { filas: FilaComparacion[]; porPlanta: boolean } {
  const otras = r.otrasTemporadas.filter((t) => t.mismoCultivo);
  const todas: Omit<FilaComparacion, 'ancho'>[] = [
    { id: actual.id, nombre: actual.nombre, desde: actual.desde, hasta: null, kg: r.totalKg, kgPorPlanta: r.kgPorPlanta, actual: true, enCurso: true },
    ...otras.map((t: TemporadaComparada) => ({
      id: t.siembraId, nombre: t.cultivo, desde: t.fechaSiembra, hasta: t.fechaFin,
      kg: t.totalKg, kgPorPlanta: t.kgPorPlanta, actual: false, enCurso: t.enCurso,
    })),
  ].sort((a, b) => b.desde.localeCompare(a.desde));
  const porPlanta = todas.every((f) => f.kgPorPlanta != null);
  const valor = (f: Omit<FilaComparacion, 'ancho'>) => (porPlanta ? f.kgPorPlanta ?? 0 : f.kg);
  const max = Math.max(0, ...todas.map(valor));
  return { porPlanta, filas: todas.map((f) => ({ ...f, ancho: max > 0 ? (valor(f) / max) * 100 : 0 })) };
}
