import { Jornal, PagosDelMes, ResumenNominas, Trabajador } from '../../core/models/worker.model';
import { Lote } from '../../core/models/crop.model';

export interface DatosInicio {
  /** Cantidad y total de nóminas por estado (GET /api/payrolls/summary) */
  nominas: ResumenNominas[];
  /** Lo pagado cada mes desde el mes anterior (GET /api/payments/monthly) */
  pagosPorMes: PagosDelMes[];
  trabajadores: Trabajador[];
  jornales: Jornal[];
  lotes: Lote[];
}

export interface Tendencia {
  actual: number;
  anterior: number;
  /** Variación en % frente al mes anterior; null si el mes anterior fue 0 */
  porcentaje: number | null;
}

export interface ResumenInicio {
  porAprobar: { n: number; total: number };
  sinPagar: { n: number; total: number };
  solicitudesPortal: number;
  lotesDisponibles: number;
  lotesEnCultivo: number;
  lotesTotal: number;
  trabajadoresActivos: number;
  sinJornalHoy: number;
  jornalesMes: Tendencia;
  pagadoMes: Tendencia;
  /** Cuántos pendientes hay en total (para el saludo) */
  pendientes: number;
}

/** "2026-11-04" o Date → Date local (sin el corrimiento de un día de UTC-5) */
export function fechaLocal(v: string | Date | null | undefined): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(v);
}

const mismoMes = (d: Date, ref: Date) => d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
const mismoDia = (d: Date, ref: Date) => mismoMes(d, ref) && d.getDate() === ref.getDate();

function tendencia(actual: number, anterior: number): Tendencia {
  return { actual, anterior, porcentaje: anterior > 0 ? Math.round(((actual - anterior) / anterior) * 100) : null };
}

/** Primer día del mes anterior, para pedir solo los jornales que hacen falta */
export function inicioMesAnterior(hoy: Date): Date {
  return new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
}

export function saludoSegunHora(hoy: Date): 'morning' | 'afternoon' | 'evening' {
  const h = hoy.getHours();
  return h < 12 ? 'morning' : h < 19 ? 'afternoon' : 'evening';
}

export function calcularResumen(d: DatosInicio, hoy = new Date()): ResumenInicio {
  const mesAnterior = inicioMesAnterior(hoy);
  const deEstado = (estado: string) => {
    const r = d.nominas.find((x) => x.estado === estado);
    return { n: r?.cantidad ?? 0, total: Number(r?.total ?? 0) };
  };
  const pend = deEstado('PENDIENTE');
  const aprob = deEstado('APROBADA');
  const activos = d.trabajadores.filter((t) => t.estado === 'ACTIVO');

  const conJornalHoy = new Set(
    d.jornales.filter((j) => { const f = fechaLocal(j.fecha); return f && mismoDia(f, hoy); })
      .map((j) => j.trabajador?.id ?? j.trabajadorId),
  );

  const jornalesDe = (ref: Date) => d.jornales.filter((j) => { const f = fechaLocal(j.fecha); return f && mismoMes(f, ref); }).length;
  const claveMes = (ref: Date) => `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, '0')}`;
  const pagadoEn = (ref: Date) => Number(d.pagosPorMes.find((m) => m.mes === claveMes(ref))?.total ?? 0);

  const solicitudes = d.trabajadores.filter((t) => t.accesoEstado === 'PENDIENTE').length;
  const disponibles = d.lotes.filter((l) => l.estado === 'DISPONIBLE').length;
  const sinJornal = activos.filter((t) => t.id == null || !conJornalHoy.has(t.id)).length;

  return {
    porAprobar: pend,
    sinPagar: aprob,
    solicitudesPortal: solicitudes,
    lotesDisponibles: disponibles,
    lotesEnCultivo: d.lotes.filter((l) => l.estado === 'EN_CULTIVO').length,
    lotesTotal: d.lotes.length,
    trabajadoresActivos: activos.length,
    sinJornalHoy: sinJornal,
    jornalesMes: tendencia(jornalesDe(hoy), jornalesDe(mesAnterior)),
    pagadoMes: tendencia(pagadoEn(hoy), pagadoEn(mesAnterior)),
    pendientes: pend.n + aprob.n + solicitudes,
  };
}

/** Etapas que cuentan para el avance de una siembra (sin "finalizado") */
export const ETAPAS_AVANCE = ['GERMINACION', 'CRECIMIENTO', 'PRODUCCION', 'COSECHA'] as const;

/** Cuántas etapas lleva la siembra (1 a 4) */
export function pasoEtapa(etapa: string | null | undefined): number {
  const i = ETAPAS_AVANCE.indexOf(etapa as (typeof ETAPAS_AVANCE)[number]);
  return i < 0 ? 0 : i + 1;
}

/** Días desde la siembra hasta hoy */
export function diasDesde(fecha: string | null | undefined, hoy = new Date()): number {
  const f = fechaLocal(fecha);
  if (!f) return 0;
  const h = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  return Math.max(0, Math.round((h.getTime() - f.getTime()) / 86_400_000));
}
