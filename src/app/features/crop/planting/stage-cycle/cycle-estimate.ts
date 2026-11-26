import { EtapaCultivo, EtapaSiembra, Siembra } from '../../../../core/models/crop.model';
import { pasosCiclo } from './stage-cycle.logic';

/** Las cuatro etapas que tienen duración (Finalizado es el cierre) */
export type EtapaConDuracion = Exclude<EtapaCultivo, 'FINALIZADO'>;

export interface DuracionCultivo {
  /** Días que suele durar cada etapa */
  dias: Record<EtapaConDuracion, number>;
  /** Perenne: después de la cosecha vuelve a producir (no se cierra la temporada al terminar de cosechar) */
  perenne: boolean;
  /** false: no está en la tabla y se usan tiempos generales */
  conocido: boolean;
}

const ORDEN: EtapaConDuracion[] = ['GERMINACION', 'CRECIMIENTO', 'PRODUCCION', 'COSECHA'];

/**
 * Días de referencia por etapa en condiciones de Colombia, contados desde la siembra en el lote
 * (germinación = prendimiento o emergencia; crecimiento = hasta la floración; producción = de la floración
 * a la cosecha; cosecha = lo que dura la recolección). Cambian con el clima, la altura y la variedad:
 * son una guía para avisar, no una regla.
 */
const TABLA: Record<string, [number, number, number, number, boolean]> = {
  //            germ  crec  prod  cos  perenne
  cafe: [30, 450, 230, 120, true],
  aguacate: [30, 1000, 240, 90, true],
  cacao: [30, 900, 165, 120, true],
  platano: [30, 240, 100, 30, true],
  banano: [30, 240, 90, 30, true],
  mora: [30, 180, 60, 180, true],
  lulo: [30, 210, 90, 240, true],
  uchuva: [30, 120, 60, 240, true],
  fresa: [20, 60, 30, 180, true],
  maracuya: [30, 240, 75, 180, true],
  granadilla: [30, 270, 80, 180, true],
  gulupa: [30, 270, 80, 180, true],
  naranja: [30, 1100, 240, 90, true],
  mandarina: [30, 1000, 240, 90, true],
  limon: [30, 900, 180, 120, true],
  mango: [30, 1100, 120, 60, true],
  pina: [30, 450, 150, 30, false],
  tomate: [25, 45, 30, 60, false],
  papa: [20, 40, 50, 20, false],
  maiz: [10, 50, 60, 20, false],
  frijol: [10, 30, 30, 20, false],
  arveja: [10, 35, 30, 20, false],
  cebolla: [15, 60, 45, 20, false],
  yuca: [20, 180, 120, 30, false],
};
const GENERAL: [number, number, number, number, boolean] = [20, 60, 45, 30, false];

/** "Café" → "cafe", "Fríjol" → "frijol", "Piña" → "pina" */
function normalizar(t: string | null | undefined): string {
  return (t ?? '').normalize('NFD').replace(/\p{M}/gu, '').trim().toLowerCase();
}

export function duracionDe(tipoCultivo: string | null | undefined): DuracionCultivo {
  const n = normalizar(tipoCultivo);
  // "Café Castillo" o "Plátano hartón" también cuentan: se busca por la primera palabra
  const fila = TABLA[n] ?? TABLA[n.split(/\s+/)[0]];
  const [g, c, p, k, perenne] = fila ?? GENERAL;
  return {
    dias: { GERMINACION: g, CRECIMIENTO: c, PRODUCCION: p, COSECHA: k },
    perenne,
    conocido: !!fila,
  };
}

export interface EstimadoCiclo {
  duracion: DuracionCultivo;
  /** Fecha estimada en que empieza cada etapa que todavía no llega (y Finalizado en los de ciclo corto) */
  fechas: Partial<Record<EtapaCultivo, string>>;
  /** Días que suele durar la etapa actual */
  diasNormales: number | null;
  /** La etapa a la que ya debería haber pasado (Finalizado = terminar la temporada); null si va a tiempo */
  sugerida: EtapaCultivo | null;
  /** Desde cuándo, según lo normal */
  desde: string | null;
}

function sumarDias(fecha: string, dias: number): string {
  const d = new Date(Date.UTC(+fecha.slice(0, 4), +fecha.slice(5, 7) - 1, +fecha.slice(8, 10)));
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/**
 * Fechas estimadas de lo que falta del ciclo, contadas desde que empezó la etapa actual,
 * y la etapa a la que ya debería haber pasado según lo normal del cultivo.
 */
export function estimarCiclo(siembra: Siembra, etapas: EtapaSiembra[], hoy: string): EstimadoCiclo {
  const duracion = duracionDe(siembra.tipoCultivo);
  const actual = siembra.estadoCultivo;
  const vacio: EstimadoCiclo = {
    duracion,
    fechas: {},
    diasNormales: null,
    sugerida: null,
    desde: null,
  };
  if (actual === 'FINALIZADO') return vacio;

  const inicio =
    pasosCiclo(siembra, etapas).find((p) => p.etapa === actual)?.fecha ?? siembra.fechaSiembra;
  // Sin una fecha válida no hay desde dónde contar
  if (!inicio || !/^\d{4}-\d{2}-\d{2}/.test(inicio)) return vacio;
  const i = ORDEN.indexOf(actual as EtapaConDuracion);
  if (i < 0) return vacio;
  const fechas: Partial<Record<EtapaCultivo, string>> = {};
  let cursor = inicio;
  for (let j = i; j < ORDEN.length; j++) {
    cursor = sumarDias(cursor, duracion.dias[ORDEN[j]]);
    const siguiente: EtapaCultivo | undefined =
      ORDEN[j + 1] ?? (duracion.perenne ? undefined : 'FINALIZADO');
    if (siguiente) fechas[siguiente] = cursor;
  }

  const proxima: EtapaCultivo | undefined =
    ORDEN[i + 1] ?? (duracion.perenne ? undefined : 'FINALIZADO');
  const desde = proxima ? (fechas[proxima] ?? null) : null;
  // Las fechas "yyyy-MM-dd" se comparan como texto
  const llego = !!proxima && !!desde && desde <= hoy;
  return {
    duracion,
    fechas,
    diasNormales: duracion.dias[actual as EtapaConDuracion],
    sugerida: llego ? proxima! : null,
    desde: llego ? desde : null,
  };
}

/** Las etapas con sus días, para mostrar de dónde salen las fechas */
export function etapasConDias(d: DuracionCultivo): { etapa: EtapaConDuracion; dias: number }[] {
  return ORDEN.map((etapa) => ({ etapa, dias: d.dias[etapa] }));
}
