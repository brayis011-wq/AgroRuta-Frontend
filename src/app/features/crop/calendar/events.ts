import { TranslateService } from '@ngx-translate/core';
import { EstadoEvento, EventoCalendario, TipoEvento } from '../../../core/models/crop.model';

export const ICONO_EVENTO: Record<TipoEvento, string> = {
  SIEMBRA: 'ti-seedling',
  ETAPA: 'ti-flag',
  ACTIVIDAD: 'ti-clipboard-list',
  FUMIGACION: 'ti-spray',
  COSECHA: 'ti-basket',
  FIN_CARENCIA: 'ti-basket-check',
  FIN_REENTRADA: 'ti-door-enter',
  FUMIGACION_SUGERIDA: 'ti-spray',
  PROXIMA_ETAPA: 'ti-flag-2',
  COSECHA_ESTIMADA: 'ti-basket',
};

/** Color de cada tipo (mismos tonos que el resto de Cultivos) */
export const TONO_EVENTO: Record<TipoEvento, 'verde' | 'azul' | 'ambar' | 'gris' | 'rojo'> = {
  SIEMBRA: 'verde',
  ETAPA: 'verde',
  ACTIVIDAD: 'gris',
  FUMIGACION: 'azul',
  COSECHA: 'ambar',
  FIN_CARENCIA: 'rojo',
  FIN_REENTRADA: 'ambar',
  FUMIGACION_SUGERIDA: 'azul',
  PROXIMA_ETAPA: 'verde',
  COSECHA_ESTIMADA: 'ambar',
};

/** Lo que falta por hacer o vigilar (no lo ya hecho) */
export function esPorVenir(e: EventoCalendario): boolean {
  return e.estado !== 'HECHO';
}

/** Orden para la agenda: primero lo atrasado, luego por fecha */
export function ordenAgenda(a: EventoCalendario, b: EventoCalendario): number {
  const peso = (s: EstadoEvento) => (s === 'ATRASADO' ? 0 : 1);
  return peso(a.estado) - peso(b.estado) || a.fecha.localeCompare(b.fecha) || a.tipo.localeCompare(b.tipo);
}

/** Texto principal y secundario de un evento, traducidos */
export function textoEvento(e: EventoCalendario, t: TranslateService, num: (v: number, d?: number) => string): { titulo: string; sub: string } {
  const k = (clave: string, p?: object) => t.instant('temporadas.cal.tipo.' + clave, p) as string;
  const etapa = (v: string | null) => (v ? (t.instant('enums.etapaCultivo.' + v) as string) : '');
  switch (e.tipo) {
    case 'SIEMBRA': return { titulo: k('SIEMBRA'), sub: e.cultivo };
    case 'ETAPA': return { titulo: k('ETAPA', { etapa: etapa(e.titulo) }), sub: '' };
    case 'ACTIVIDAD': return {
      titulo: t.instant('enums.tipoActividad.' + (e.titulo ?? 'OTRO')) + (e.estado === 'PENDIENTE' ? ' · ' + k('scheduled') : ''),
      sub: e.detalle ?? '',
    };
    case 'FUMIGACION': return { titulo: k('FUMIGACION', { producto: e.titulo ?? '' }), sub: '' };
    case 'COSECHA': return {
      titulo: k('COSECHA', { kg: num(Number(e.titulo) || 0, 1) }),
      sub: e.detalle ? (t.instant('enums.calidadCosecha.' + e.detalle) as string) : '',
    };
    case 'FIN_CARENCIA': return { titulo: k('FIN_CARENCIA'), sub: k('carenciaSub', { producto: e.titulo ?? '', days: e.detalle }) };
    case 'FIN_REENTRADA': return { titulo: k('FIN_REENTRADA'), sub: k('reentradaSub', { producto: e.titulo ?? '', hours: e.detalle }) };
    case 'FUMIGACION_SUGERIDA': return {
      titulo: k(e.estado === 'ATRASADO' ? 'FUMIGACION_ATRASADA' : 'FUMIGACION_SUGERIDA'),
      sub: k('cadaDias', { days: e.detalle }),
    };
    case 'PROXIMA_ETAPA': return { titulo: k('PROXIMA_ETAPA', { etapa: etapa(e.titulo) }), sub: k('estimado') };
    case 'COSECHA_ESTIMADA': return { titulo: k('COSECHA_ESTIMADA'), sub: k('estimadoDias', { days: e.detalle }) };
  }
}

/** "yyyy-MM-dd" en hora local */
export function iso(d: Date): string {
  return d.toLocaleDateString('en-CA');
}

export function desdeIso(v: string): Date {
  const [y, m, d] = v.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Días de la cuadrícula del mes: de lunes a domingo, completando con días de los meses vecinos */
export function diasDelMes(anio: number, mes: number): { fecha: string; delMes: boolean }[] {
  const primero = new Date(anio, mes, 1);
  const inicio = new Date(primero);
  inicio.setDate(1 - ((primero.getDay() + 6) % 7)); // lunes anterior
  const ultimo = new Date(anio, mes + 1, 0);
  const fin = new Date(ultimo);
  fin.setDate(ultimo.getDate() + (6 - ((ultimo.getDay() + 6) % 7))); // domingo siguiente
  const dias: { fecha: string; delMes: boolean }[] = [];
  for (const d = new Date(inicio); d <= fin; d.setDate(d.getDate() + 1)) {
    dias.push({ fecha: iso(d), delMes: d.getMonth() === mes });
  }
  return dias;
}

/** Días desde hoy hasta la fecha (negativo si ya pasó) */
export function diasHasta(fecha: string, hoy: string): number {
  return Math.round((desdeIso(fecha).getTime() - desdeIso(hoy).getTime()) / 86_400_000);
}

/** Etiqueta corta para la cuadrícula del mes */
export function textoCorto(e: EventoCalendario, t: TranslateService, num: (v: number, d?: number) => string): string {
  const k = (clave: string) => t.instant('temporadas.cal.corto.' + clave) as string;
  switch (e.tipo) {
    case 'ETAPA':
    case 'PROXIMA_ETAPA': return t.instant('enums.etapaCultivo.' + (e.titulo ?? '')) as string;
    case 'ACTIVIDAD': return t.instant('enums.tipoActividad.' + (e.titulo ?? 'OTRO')) as string;
    case 'FUMIGACION': return e.titulo ?? k('FUMIGACION');
    case 'COSECHA': return num(Number(e.titulo) || 0, 0) + ' kg';
    default: return k(e.tipo);
  }
}
