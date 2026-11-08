export interface Finca {
  id?: number;
  nombre: string;
  ubicacion: string;
  hectareas: number;
  agricultorId: number;
  fechaRegistro?: string;
  centroideLat?: number;
  centroideLng?: number;
}

export interface Lote {
  id?: number;
  nombre: string;
  area: number;
  estado: EstadoLote;
  fincaId: number;
  coordenadas?: string;
  centroideLat?: number;
  centroideLng?: number;
}

export interface Siembra {
  id?: number;
  fechaSiembra: string;
  cantidadPlantas: number;
  /** Nombre del cultivo, p. ej. "Café" */
  tipoCultivo?: string | null;
  /** Nombre de la variedad, p. ej. "Castillo" */
  variedad: string;
  variedadId?: number | null;
  estadoCultivo: EtapaCultivo;
  loteId: number;
  /** Día en que terminó la temporada (null mientras esté en curso) */
  fechaFin?: string | null;
}

export type EtapaCultivo = 'GERMINACION' | 'CRECIMIENTO' | 'PRODUCCION' | 'COSECHA' | 'FINALIZADO';

/** Orden de las etapas de una siembra */
export const ETAPAS_CULTIVO: EtapaCultivo[] = ['GERMINACION', 'CRECIMIENTO', 'PRODUCCION', 'COSECHA', 'FINALIZADO'];

/** Cuándo entró una siembra en cada etapa */
export interface EtapaSiembra {
  id: number;
  siembraId: number;
  etapa: EtapaCultivo;
  fecha: string;
}

export type EstadoLote = 'DISPONIBLE' | 'EN_CULTIVO' | 'EN_DESCANSO';

export function siembraActiva(s: Pick<Siembra, 'estadoCultivo'> | null | undefined): boolean {
  return !!s && s.estadoCultivo !== 'FINALIZADO';
}

export interface SiembraRequest {
  fechaSiembra: string;
  cantidadPlantas: number;
  variedadId: number;
  loteId: number;
}

export interface VariedadCultivo {
  id: number;
  nombre: string;
  activo: boolean;
  tipoCultivoId: number;
  tipoCultivoNombre: string;
}

export interface TipoCultivo {
  id: number;
  nombre: string;
  activo: boolean;
  variedades: VariedadCultivo[];
}

/** "Café · Castillo"; las siembras sin tipo muestran solo la variedad */
export function nombreCultivo(s: { tipoCultivo?: string | null; variedad?: string | null } | null | undefined): string {
  if (!s) return '';
  return s.tipoCultivo ? `${s.tipoCultivo} · ${s.variedad ?? ''}` : (s.variedad ?? '');
}

export interface ActividadCultivo {
  id?: number;
  tipo: 'PODA' | 'TUTOREO' | 'DESHIERBE' | 'RIEGO' | 'REVISION' | 'OTRO';
  descripcion: string;
  fecha: string;
  siembraId: number;
  /** Materiales o servicios (COP), aparte de los jornales */
  costo?: number | null;
}

export interface Fumigacion {
  id?: number;
  fecha: string;
  producto: string;
  agriculturalInputId?: number | null;
  /** Días sin cosechar después de aplicar */
  diasCarencia?: number | null;
  /** Horas sin entrar al lote después de aplicar */
  reentradaHoras?: number | null;
  /** Costo del producto aplicado (COP) */
  costo?: number | null;
  /** Producto gastado en total (se descontó de la bodega); la dosis es una concentración */
  cantidadUsada?: number | null;
  unidadCantidad?: 'LITROS' | 'ML' | 'GRAMOS' | 'KG' | null;
  dosis: number;
  unidadMedida: 'LITROS' | 'ML' | 'GRAMOS' | 'KG';
  areaAplicada: number;
  observaciones?: string;
  siembraId: number;
}

export interface Cosecha {
  id?: number;
  fecha: string;
  cantidadKg: number;
  calidad: 'PRIMERA' | 'SEGUNDA' | 'TERCERA';
  observaciones?: string;
  siembraId: number;
  /** Precio de venta por kilo (COP) */
  precioKg?: number | null;
}

/** Una restricción vigente de una fumigación (carencia o reentrada) */
export interface RestriccionVigente {
  producto: string;
  aplicada: string;
  /** Primer día en que ya se puede cosechar o entrar */
  libreDesde: string;
  diasRestantes: number;
  /** Días de carencia u horas de reentrada del producto */
  valor: number;
}

export interface SemanaCosecha {
  /** Lunes de la semana */
  semana: string;
  primera: number;
  segunda: number;
  tercera: number;
}

export interface TemporadaComparada {
  siembraId: number;
  cultivo: string;
  fechaSiembra: string;
  fechaFin: string | null;
  enCurso: boolean;
  totalKg: number;
  kgPorPlanta: number | null;
  mismoCultivo: boolean;
}

/** GET /api/siembras/{id}/resumen */
export interface ResumenSiembra {
  siembraId: number;
  totalKg: number;
  cosechas: number;
  kgPrimera: number;
  kgSegunda: number;
  kgTercera: number;
  kgPorPlanta: number | null;
  kgPorHectarea: number | null;
  areaHa: number | null;
  semanas: SemanaCosecha[];
  carencia: RestriccionVigente | null;
  reentrada: RestriccionVigente | null;
  otrasTemporadas: TemporadaComparada[];
}

/** GET /api/siembras/{id}/costos (pesos colombianos) */
export interface CostosSiembra {
  siembraId: number;
  manoObra: number;
  jornales: number;
  insumos: number;
  otros: number;
  costoTotal: number;
  ingresos: number;
  kgTotal: number;
  kgConPrecio: number;
  precioPromedioKg: number | null;
  ganancia: number | null;
  costoPorKg: number | null;
  trabajadores: { trabajadorId: number | null; nombre: string | null; jornales: number; valor: number }[];
  meses: { mes: string; manoObra: number; insumos: number; otros: number; ingresos: number }[];
  fumigacionesSinCosto: number;
  cosechasSinPrecio: number;
}

export type TipoEvento =
  | 'SIEMBRA' | 'ETAPA' | 'ACTIVIDAD' | 'FUMIGACION' | 'COSECHA' | 'FIN_CARENCIA' | 'FIN_REENTRADA'
  | 'FUMIGACION_SUGERIDA' | 'PROXIMA_ETAPA' | 'COSECHA_ESTIMADA';
export type EstadoEvento = 'HECHO' | 'PENDIENTE' | 'ESTIMADO' | 'ATRASADO';

/** Un evento del calendario de cultivo */
export interface EventoCalendario {
  fecha: string;
  tipo: TipoEvento;
  estado: EstadoEvento;
  titulo: string | null;
  detalle: string | null;
  siembraId: number;
  loteId: number | null;
  loteNombre: string | null;
  cultivo: string;
  refId: number | null;
}
