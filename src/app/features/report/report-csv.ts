import { CropDetail, WorkerPayrollDetail } from '../../core/services/report.service';
import { Celda } from '../../shared/csv';
import { FilaCostos } from './costs/costs-calc';
import { RentabilidadLote } from './profitability/profitability-calc';

/** Traduce una clave (TranslateService.instant) */
export type Traducir = (clave: string) => string;

export interface TablaCsv {
  encabezados: string[];
  filas: Celda[][];
}

const col = (t: Traducir, ...claves: string[]) => claves.map((c) => t(`reports.csv.cols.${c}`));
const fecha = (v: string | null | undefined) => (v ? v.slice(0, 10) : '');
/** El servidor manda la variedad como "Café · Castillo": en su columna basta "Castillo" */
const variedad = (c: CropDetail) => {
  const prefijo = c.cultivo ? `${c.cultivo} · ` : '';
  return prefijo && c.variedad?.startsWith(prefijo) ? c.variedad.slice(prefijo.length) : (c.variedad ?? '');
};

/** Nómina: una fila por trabajador */
export function tablaNomina(filas: WorkerPayrollDetail[], t: Traducir): TablaCsv {
  return {
    encabezados: col(t, 'worker', 'from', 'to', 'workdays', 'payments', 'totalPaid'),
    filas: filas.map((w) => [w.workerName, fecha(w.periodoInicio), fecha(w.periodoFin), w.totalJornales, w.totalPagos, w.totalPaid]),
  };
}

/** Cultivos: una fila por siembra */
export function tablaCultivos(filas: CropDetail[], t: Traducir): TablaCsv {
  return {
    encabezados: col(t, 'crop', 'variety', 'farm', 'plot', 'stage', 'planted', 'finished', 'days', 'harvests', 'kg'),
    filas: filas.map((c) => [
      c.cultivo ?? '', variedad(c), c.fincaNombre ?? '', c.loteNombre ?? '', t(`enums.etapaCultivo.${c.estado}`),
      fecha(c.fechaSiembra), fecha(c.fechaFin), c.diasDesdeSiembra, c.totalCosechas, c.totalKgCosechado ?? 0,
    ]),
  };
}

/** Costos: una fila por temporada (sin costos cargados, las cifras quedan vacías) */
export function tablaCostos(filas: FilaCostos[], t: Traducir): TablaCsv {
  return {
    encabezados: col(t, 'crop', 'variety', 'farm', 'plot', 'planted', 'finished',
      'labor', 'workdays', 'inputs', 'other', 'totalCost', 'kg', 'income', 'profit', 'costPerKg'),
    filas: filas.map(({ siembra: s, costos: c }) => [
      s.cultivo ?? '', variedad(s), s.fincaNombre ?? '', s.loteNombre ?? '', fecha(s.fechaSiembra), fecha(s.fechaFin),
      c?.manoObra, c?.jornales, c?.insumos, c?.otros, c?.costoTotal, c?.kgTotal, c?.ingresos, c?.ganancia, c?.costoPorKg,
    ]),
  };
}

/** Rentabilidad: una fila por temporada de cada lote */
export function tablaRentabilidad(lotes: RentabilidadLote[], t: Traducir): TablaCsv {
  return {
    encabezados: col(t, 'farm', 'plot', 'areaHa', 'season', 'planted', 'finished', 'totalCost', 'income', 'kg', 'profit', 'marginPct'),
    filas: lotes.flatMap((l) => l.temporadas.map((s) => [
      l.fincaNombre ?? '', l.loteNombre, l.areaHa, s.nombre, fecha(s.fechaSiembra), fecha(s.fechaFin),
      s.costo, s.ingresos, s.kg, s.ganancia, s.margen,
    ])),
  };
}
