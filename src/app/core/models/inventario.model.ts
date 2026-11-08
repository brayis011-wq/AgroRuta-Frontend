import { MeasurementUnit } from './AgriculturalInput.model';

/** El stock se guarda en la unidad más pequeña: ml para líquidos, g para sólidos */
export type UnidadBase = 'ML' | 'GRAMOS';
export type EstadoStock = 'OK' | 'BAJO' | 'AGOTADO' | 'NEGATIVO';
export type TipoMovimiento = 'COMPRA' | 'USO' | 'AJUSTE';

export interface StockInsumo {
  insumoId: number;
  nombre: string;
  tipo: string | null;
  unidadBase: UnidadBase;
  /** En unidad base (ml o g) */
  cantidad: number;
  stockMinimo: number | null;
  /** COP por ml o g, según las compras con precio */
  costoPromedio: number | null;
  valorStock: number | null;
  estado: EstadoStock;
  ultimoMovimiento: string | null;
}

export interface MovimientoInventario {
  id: number;
  insumoId: number;
  tipo: TipoMovimiento;
  /** En unidad base; en los ajustes el signo dice si se sumó o se restó */
  cantidad: number;
  fecha: string;
  costoTotal: number | null;
  proveedor: string | null;
  fumigacionId: number | null;
  observaciones: string | null;
}

export interface CompraRequest {
  insumoId: number;
  cantidad: number;
  unidad: MeasurementUnit;
  costoTotal?: number | null;
  fecha?: string | null;
  proveedor?: string | null;
  observaciones?: string | null;
}

export interface AjusteRequest {
  insumoId: number;
  cantidadReal: number;
  unidad: MeasurementUnit;
  observaciones?: string | null;
}

export interface CostoEstimado {
  costo: number | null;
  costoPorUnidad: number | null;
  disponible: number;
  unidadBase: UnidadBase;
}

/** Unidades que se pueden usar con un insumo (las de su mismo tipo) */
export function unidadesDe(base: UnidadBase): MeasurementUnit[] {
  return base === 'ML' ? ['LITROS', 'ML'] : ['KG', 'GRAMOS'];
}

export function unidadBaseDe(u: MeasurementUnit): UnidadBase {
  return u === 'LITROS' || u === 'ML' ? 'ML' : 'GRAMOS';
}

/** Unidad grande para mostrar y para los formularios: litros o kilos */
export function unidadGrande(base: UnidadBase): MeasurementUnit {
  return base === 'ML' ? 'LITROS' : 'KG';
}

/** "2,5 L", "750 ml", "1,2 kg", "300 g" */
export function formatoCantidad(base: number | null | undefined, unidad: UnidadBase, locale = 'es-CO'): string {
  if (base == null) return '—';
  const grande = Math.abs(base) >= 1000;
  const valor = grande ? base / 1000 : base;
  const u = unidad === 'ML' ? (grande ? 'L' : 'ml') : (grande ? 'kg' : 'g');
  const n = new Intl.NumberFormat(locale, { maximumFractionDigits: grande ? 2 : 0 }).format(valor);
  return `${n} ${u}`;
}

/** Cantidad en la unidad base expresada en la unidad grande (para precargar formularios) */
export function enUnidadGrande(base: number): number {
  return Math.round((base / 1000) * 1000) / 1000;
}
