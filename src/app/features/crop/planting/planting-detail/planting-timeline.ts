import { ActividadCultivo, Cosecha, Fumigacion } from '../../../../core/models/crop.model';

/** Una fila del historial de la siembra: actividad, fumigación o cosecha */
export interface TimelineItem {
  id: number;
  fecha: string;
  tipo: 'actividad' | 'fumigacion' | 'cosecha';
  tituloKey?: string; // clave de traducción (actividad)
  titulo?: string; // texto directo (producto / kg)
  detalle?: string; // descripción libre del usuario (actividad)
  dosis?: number; // fumigación
  unidad?: string;
  area?: number;
  calidad?: string; // cosecha
  enCarencia?: boolean; // cosecha registrada dentro de la carencia de una fumigación
  recolectores?: number; // cosecha: cuántos la recogieron
  kg?: number; // cosecha: kilos
  carencia?: number | null; // fumigación: días sin cosechar
  reentrada?: number | null; // fumigación: horas sin entrar
  extra?: string;
}

/** Cómo se escriben números y unidades en el idioma activo */
export interface TextosHistorial {
  num: (v: number) => string;
  unidad: (u: string) => string;
}

/** Junta actividades, fumigaciones y cosechas en un solo historial, de la más reciente a la más vieja. */
export function armarHistorial(
  actividades: ActividadCultivo[],
  fumigaciones: Fumigacion[],
  cosechas: Cosecha[],
  textos: TextosHistorial,
): TimelineItem[] {
  const items: TimelineItem[] = [];

  for (const a of actividades) {
    items.push({
      id: a.id!,
      fecha: a.fecha,
      tipo: 'actividad',
      tituloKey: 'enums.tipoActividad.' + a.tipo,
      detalle: a.descripcion,
      // El insumo que gastó (abonado...): "Abono 15-15-15 · 50 kg"
      extra: a.producto
        ? a.producto +
          (a.cantidadUsada
            ? ` · ${textos.num(a.cantidadUsada)} ${textos.unidad(String(a.unidadCantidad))}`
            : '')
        : undefined,
    });
  }

  for (const f of fumigaciones) {
    items.push({
      id: f.id!,
      carencia: f.diasCarencia ?? null,
      reentrada: f.reentradaHoras ?? null,
      fecha: f.fecha,
      tipo: 'fumigacion',
      titulo: f.producto,
      dosis: f.dosis,
      unidad: f.unidadMedida,
      area: f.areaAplicada,
      extra: f.observaciones,
    });
  }

  for (const c of cosechas) {
    items.push({
      id: c.id!,
      fecha: c.fecha,
      tipo: 'cosecha',
      titulo: `${textos.num(c.cantidadKg)} kg`,
      calidad: c.calidad,
      enCarencia: !!c.enCarencia,
      recolectores: c.recolectores?.length ?? 0,
      kg: c.cantidadKg,
      extra: c.observaciones,
    });
  }

  return items.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
}
