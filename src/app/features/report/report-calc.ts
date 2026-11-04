import { CropDetail, CropReport, MonthlyPayment, PayrollReport, WorkerPayrollDetail } from '../../core/services/report.service';

export const ETAPAS = ['GERMINACION', 'CRECIMIENTO', 'PRODUCCION', 'COSECHA', 'FINALIZADO'] as const;

export interface BarraMes { mes: string; etiqueta: string; total: number; pagos: number; altura: number; actual: boolean }
export interface Participacion { nombre: string; valor: number; porcentaje: number; ancho: number }

const MESES = { es: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
                en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] };

/** "2026-11" → "nov" (con el año si cambia: "ene 27") */
export function mesCorto(mes: string, lang: string, conAnio = false): string {
  const [a, m] = mes.split('-').map(Number);
  const nombre = (lang === 'en' ? MESES.en : MESES.es)[(m || 1) - 1] ?? mes;
  return conAnio ? `${nombre} ${String(a).slice(2)}` : nombre;
}

/** Barras de la gráfica mensual; la altura va de 0 a 100 respecto al mes más alto */
export function barrasMensuales(meses: MonthlyPayment[] | undefined, lang: string): BarraMes[] {
  const lista = meses ?? [];
  const max = Math.max(0, ...lista.map((m) => m.total ?? 0));
  return lista.map((m, i) => ({
    mes: m.mes,
    etiqueta: mesCorto(m.mes, lang, i > 0 && m.mes.slice(0, 4) !== lista[i - 1].mes.slice(0, 4)),
    total: m.total ?? 0,
    pagos: m.pagos ?? 0,
    altura: max > 0 ? Math.round(((m.total ?? 0) / max) * 100) : 0,
    actual: i === lista.length - 1,
  }));
}

/** Variación del último mes frente al anterior, en %; null si el anterior fue 0 */
export function variacionUltimoMes(meses: MonthlyPayment[] | undefined): number | null {
  const l = meses ?? [];
  if (l.length < 2) return null;
  const prev = l[l.length - 2].total ?? 0;
  return prev > 0 ? Math.round((((l[l.length - 1].total ?? 0) - prev) / prev) * 100) : null;
}

/** Parte de cada uno sobre el total; ancho relativo al mayor (para las barras) */
export function participacion<T>(items: T[], nombre: (t: T) => string, valor: (t: T) => number): Participacion[] {
  const total = items.reduce((s, t) => s + (valor(t) || 0), 0);
  const max = Math.max(0, ...items.map((t) => valor(t) || 0));
  return items.map((t) => ({
    nombre: nombre(t),
    valor: valor(t) || 0,
    porcentaje: total > 0 ? Math.round(((valor(t) || 0) / total) * 100) : 0,
    ancho: max > 0 ? ((valor(t) || 0) / max) * 100 : 0,
  }));
}

export function resumenNomina(r: PayrollReport) {
  const ws = r.workerDetails ?? [];
  const jornales = ws.reduce((s, w) => s + (w.totalJornales ?? 0), 0);
  const pagos = ws.reduce((s, w) => s + (w.totalPagos ?? 0), 0);
  return {
    total: r.totalAccumulated ?? 0,
    pagos,
    pendiente: r.totalPendiente ?? 0,
    nominasPendientes: r.nominasPendientes ?? 0,
    trabajadores: ws.length,
    promedio: ws.length ? Math.round((r.totalAccumulated ?? 0) / ws.length) : 0,
    jornales,
    valorJornalPromedio: jornales ? Math.round((r.totalAccumulated ?? 0) / jornales) : 0,
  };
}

export type OrdenNomina = 'total' | 'nombre' | 'jornales';

export function ordenarTrabajadores(ws: WorkerPayrollDetail[], orden: OrdenNomina, filtro: string): WorkerPayrollDetail[] {
  const q = normalizar(filtro);
  const lista = ws.filter((w) => !q || normalizar(w.workerName).includes(q));
  const cmp: Record<OrdenNomina, (a: WorkerPayrollDetail, b: WorkerPayrollDetail) => number> = {
    total: (a, b) => (b.totalPaid ?? 0) - (a.totalPaid ?? 0),
    nombre: (a, b) => a.workerName.localeCompare(b.workerName),
    jornales: (a, b) => (b.totalJornales ?? 0) - (a.totalJornales ?? 0),
  };
  return [...lista].sort(cmp[orden]);
}

// ── Cultivos ────────────────────────────────────────────────────────────

/** El cultivo para agrupar: el tipo si viene, si no lo que va antes de " · " */
export function cultivoDe(c: CropDetail): string {
  if (c.cultivo) return c.cultivo;
  const v = c.variedad ?? '—';
  const i = v.indexOf(' · ');
  return i > 0 ? v.slice(0, i) : v;
}

export function ubicacionDe(c: CropDetail): string {
  return [c.fincaNombre, c.loteNombre].filter(Boolean).join(' · ') || '—';
}

export function resumenCultivos(r: CropReport) {
  const cs = r.cropDetails ?? [];
  const kg = cs.reduce((s, c) => s + (c.totalKgCosechado ?? 0), 0);
  const cosechas = cs.reduce((s, c) => s + (c.totalCosechas ?? 0), 0);
  const activas = cs.filter((c) => c.estado !== 'FINALIZADO').length;
  const porEtapa = ETAPAS.map((e) => ({ etapa: e, n: cs.filter((c) => c.estado === e).length }));
  const kgPorCultivo = new Map<string, number>();
  cs.forEach((c) => kgPorCultivo.set(cultivoDe(c), (kgPorCultivo.get(cultivoDe(c)) ?? 0) + (c.totalKgCosechado ?? 0)));
  const cultivos = [...kgPorCultivo.entries()].sort((a, b) => b[1] - a[1]);
  return {
    siembras: cs.length, activas, finalizadas: cs.length - activas, kg, cosechas,
    kgPorCosecha: cosechas ? kg / cosechas : 0,
    tipos: kgPorCultivo.size,
    porEtapa: porEtapa.map((p) => ({ ...p, porcentaje: cs.length ? (p.n / cs.length) * 100 : 0 })),
    kgPorCultivo: participacion(cultivos, ([n]) => n, ([, v]) => v),
  };
}

export function filtrarSiembras(cs: CropDetail[], etapa: string | null, texto: string): CropDetail[] {
  const q = normalizar(texto);
  return cs.filter((c) => (!etapa || c.estado === etapa)
    && (!q || [c.variedad, c.fincaNombre, c.loteNombre].some((x) => normalizar(x ?? '').includes(q))));
}

export function normalizar(t: string): string {
  return (t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}
