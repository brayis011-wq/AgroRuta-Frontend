import { Jornal, Nomina, Pago, Trabajador } from '../../core/models/worker.model';
import { Lote } from '../../core/models/cultivo.model';

export interface DatosInicio {
  nominas: Nomina[];
  pagos: Pago[];
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
  const suma = (ns: Nomina[]) => ns.reduce((s, n) => s + (n.valorTotal ?? 0), 0);

  const pend = d.nominas.filter((n) => n.estado === 'PENDIENTE');
  const aprob = d.nominas.filter((n) => n.estado === 'APROBADA');
  const activos = d.trabajadores.filter((t) => t.estado === 'ACTIVO');

  const conJornalHoy = new Set(
    d.jornales.filter((j) => { const f = fechaLocal(j.fecha); return f && mismoDia(f, hoy); })
      .map((j) => j.trabajador?.id ?? j.trabajadorId),
  );

  const jornalesDe = (ref: Date) => d.jornales.filter((j) => { const f = fechaLocal(j.fecha); return f && mismoMes(f, ref); }).length;
  const pagadoEn = (ref: Date) => d.pagos
    .filter((p) => { const f = fechaLocal(p.fechaPago ?? p.fecha); return f && mismoMes(f, ref); })
    .reduce((s, p) => s + (p.monto ?? 0), 0);

  const solicitudes = d.trabajadores.filter((t) => t.accesoEstado === 'PENDIENTE').length;
  const disponibles = d.lotes.filter((l) => l.estado === 'DISPONIBLE').length;
  const sinJornal = activos.filter((t) => t.id == null || !conJornalHoy.has(t.id)).length;

  return {
    porAprobar: { n: pend.length, total: suma(pend) },
    sinPagar: { n: aprob.length, total: suma(aprob) },
    solicitudesPortal: solicitudes,
    lotesDisponibles: disponibles,
    lotesEnCultivo: d.lotes.filter((l) => l.estado === 'EN_CULTIVO').length,
    lotesTotal: d.lotes.length,
    trabajadoresActivos: activos.length,
    sinJornalHoy: sinJornal,
    jornalesMes: tendencia(jornalesDe(hoy), jornalesDe(mesAnterior)),
    pagadoMes: tendencia(pagadoEn(hoy), pagadoEn(mesAnterior)),
    pendientes: pend.length + aprob.length + solicitudes,
  };
}

/** Un día de la gráfica de jornales */
export interface DiaJornales {
  fecha: Date;
  n: number;
  valor: number;
  hoy: boolean;
}

/** Jornales de los últimos `dias` días (incluido hoy), día por día, para la gráfica del Inicio */
export function serieJornales(jornales: Jornal[], hoy = new Date(), dias = 14): DiaJornales[] {
  const serie: DiaJornales[] = [];
  for (let i = dias - 1; i >= 0; i--) {
    const f = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - i);
    serie.push({ fecha: f, n: 0, valor: 0, hoy: i === 0 });
  }
  for (const j of jornales) {
    const f = fechaLocal(j.fecha);
    if (!f) continue;
    const dia = serie.find((d) => mismoDia(f, d.fecha));
    if (dia) { dia.n++; dia.valor += j.valorJornal ?? j.pago ?? 0; }
  }
  return serie;
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
