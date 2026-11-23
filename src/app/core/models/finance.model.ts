// Dinero de la finca: precios de referencia, gastos generales, ventas y presupuesto; y datos de campo
// (lluvia y labores que se repiten). Los nombres siguen los del backend.

/** Precio mayorista semanal de un producto (SIPSA, DANE) */
export interface PrecioReferencia {
  producto: string;
  semana: string;
  precioKg: number;
  minimoKg: number | null;
  maximoKg: number | null;
  mercados: number;
}

/** GET /api/reference-prices/crop */
export interface PrecioCultivo {
  cultivo: string;
  /** SIPSA, PROPIO o null si no hay precio */
  fuente: 'SIPSA' | 'PROPIO' | null;
  producto: string | null;
  precioKg: number | null;
  minimoKg: number | null;
  maximoKg: number | null;
  semana: string | null;
  mercados: number | null;
  /** El producto o el precio los eligió la persona */
  elegido: boolean;
  alternativas: PrecioReferencia[];
}

export interface PreferenciaPrecio { cultivo: string; producto: string | null; precioKg: number | null }

export type CategoriaGasto = 'TRANSPORTE' | 'HERRAMIENTAS' | 'SERVICIOS' | 'MANTENIMIENTO' | 'ADMINISTRACION' | 'IMPUESTOS' | 'OTRO';
export const CATEGORIAS_GASTO: CategoriaGasto[] = ['TRANSPORTE', 'HERRAMIENTAS', 'SERVICIOS', 'MANTENIMIENTO', 'ADMINISTRACION', 'IMPUESTOS', 'OTRO'];

export interface GastoFinca {
  id?: number;
  fincaId: number;
  fincaNombre?: string;
  fecha: string;
  categoria: CategoriaGasto;
  descripcion: string;
  monto: number;
}

export interface ParteResumen { clave: string; nombre: string | null; total: number; cantidad: number }
export interface ResumenGastos { total: number; cantidad: number; porCategoria: ParteResumen[]; porFinca: ParteResumen[] }

export type EstadoVenta = 'PENDIENTE' | 'VENCIDA' | 'PAGADA';
export type MetodoCobro = 'EFECTIVO' | 'TRANSFERENCIA' | 'CHEQUE';

export interface Abono { id: number; ventaId: number; fecha: string; monto: number; metodo: MetodoCobro; observaciones: string | null }

export interface Venta {
  id: number;
  siembraId: number | null;
  siembraNombre: string | null;
  comprador: string;
  fecha: string;
  producto: string;
  cantidadKg: number | null;
  precioKg: number | null;
  total: number;
  vence: string | null;
  observaciones: string | null;
  abonado: number;
  saldo: number;
  estado: EstadoVenta;
  abonos: Abono[];
}

export interface VentaRequest {
  siembraId?: number | null;
  comprador: string;
  fecha: string;
  producto: string;
  cantidadKg?: number | null;
  precioKg?: number | null;
  total?: number | null;
  vence?: string | null;
  observaciones?: string | null;
  pagadoDeContado?: boolean;
  metodo?: MetodoCobro;
}

export interface Deudor { comprador: string; saldo: number; ventas: number; conVencidas: boolean }
/** Cómo van los precios de SIPSA */
export interface EstadoPrecios {
  hayPrecios: boolean;
  ultimaSemana: string | null;
  actualizadoEn: string | null;
  actualizando: boolean;
  ultimoIntento: string | null;
  ultimoError: string | null;
}

/** La bodega de la cosecha de una siembra: lo recogido menos lo vendido */
export interface KilosEnBodega {
  siembraId: number;
  cultivo: string | null;
  variedad: string | null;
  lote: string;
  finca: string;
  kgCosechados: number;
  kgVendidos: number;
  kgDisponibles: number;
  /** Se vendió más de lo cosechado (ventas de antes de anotar la cosecha) */
  kgSinCosecha?: number;
  ultimaCosecha: string;
  finalizada: boolean;
}

export interface ResumenVentas {
  porCobrar: number;
  vencido: number;
  ventasPendientes: number;
  ventasVencidas: number;
  vendidoMes: number;
  cobradoMes: number;
  compradores: Deudor[];
}

/** GET /api/plantings/{id}/budget */
export interface Presupuesto {
  siembraId: number;
  manoObra: number | null;
  insumos: number | null;
  otros: number | null;
  total: number;
  gastadoManoObra: number;
  gastadoInsumos: number;
  gastadoOtros: number;
  gastadoTotal: number;
  porcentaje: number | null;
  estado: 'BIEN' | 'CERCA' | 'SUPERADO';
  manoObraSuperada: boolean;
  insumosSuperados: boolean;
  otrosSuperados: boolean;
}

export interface Lluvia { fecha: string; milimetros: number }
export interface ResumenLluvia {
  ultimos7: number;
  ultimos30: number;
  ultimaLluvia: string | null;
  diasSinLluvia: number | null;
  dias: Lluvia[];
}

/** Tipos de labor que se pueden repetir: los de las actividades más fertilizar y fumigar */
export const TIPOS_PROGRAMABLES = ['FERTILIZACION', 'FUMIGACION', 'RIEGO', 'DESHIERBE', 'PODA', 'TUTOREO', 'REVISION', 'OTRO'] as const;
export type TipoProgramable = typeof TIPOS_PROGRAMABLES[number];

export interface LaborProgramada {
  id: number;
  siembraId: number;
  tipo: TipoProgramable;
  descripcion: string | null;
  cadaDias: number;
  desde: string;
  hasta: string | null;
  proxima: string | null;
  ultimaVez: string | null;
  atrasada: boolean;
  diasAtraso: number;
}

export interface LaborProgramadaRequest {
  tipo: TipoProgramable;
  descripcion?: string | null;
  cadaDias: number;
  desde: string;
  hasta?: string | null;
}
