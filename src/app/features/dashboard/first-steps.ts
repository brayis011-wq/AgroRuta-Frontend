import { Finca, Lote } from '../../core/models/crop.model';
import { ResumenJornalesInicio, ResumenNominas, Trabajador } from '../../core/models/worker.model';

export type ClavePaso = 'farm' | 'plot' | 'planting' | 'worker' | 'wage';

export interface PasoInicial {
  clave: ClavePaso;
  icono: string;
  hecho: boolean;
  /** A dónde lleva el botón del paso */
  ruta: (string | number)[];
  query?: Record<string, string | number>;
}

export interface DatosPasos {
  fincas: Finca[];
  lotes: Lote[];
  trabajadores: Trabajador[];
  jornales: ResumenJornalesInicio | null;
  nominas: ResumenNominas[];
}

/**
 * Los cinco pasos para dejar lista la cuenta: finca → lote → siembra → trabajador → jornal.
 * Se deducen de lo que el Inicio ya carga (no hace consultas nuevas).
 */
export function calcularPrimerosPasos(d: DatosPasos): PasoInicial[] {
  const primeraFinca = d.fincas.find((f) => f.id != null);
  const loteLibre = d.lotes.find((l) => l.estado === 'DISPONIBLE' && l.id != null);
  // Un lote que no está disponible ya tuvo (o tiene) una siembra
  const haSembrado = d.lotes.some((l) => l.estado === 'EN_CULTIVO' || l.estado === 'EN_DESCANSO');
  const hayNominas = d.nominas.some((n) => n.cantidad > 0);
  const hayJornales = (d.jornales?.mesActual ?? 0) + (d.jornales?.mesAnterior ?? 0) > 0 || hayNominas;

  return [
    { clave: 'farm', icono: 'ti-map-pin-plus', hecho: d.fincas.length > 0, ruta: ['/crops/new-farm'] },
    {
      clave: 'plot', icono: 'ti-square-plus', hecho: d.lotes.length > 0,
      ruta: primeraFinca ? ['/crops/farm', primeraFinca.id!, 'new-plot'] : ['/crops'],
    },
    {
      clave: 'planting', icono: 'ti-seeding', hecho: haSembrado,
      // El lote libre tiene el botón para sembrar
      ruta: loteLibre ? ['/crops/plot', loteLibre.id!] : ['/crops'],
    },
    { clave: 'worker', icono: 'ti-user-plus', hecho: d.trabajadores.length > 0, ruta: ['/worker'], query: { nuevo: 1 } },
    { clave: 'wage', icono: 'ti-calendar-plus', hecho: hayJornales, ruta: ['/worker/workdays/new'] },
  ];
}

/** El primer paso sin hacer (el que se resalta), o null si ya están todos */
export function siguientePaso(pasos: PasoInicial[]): PasoInicial | null {
  return pasos.find((p) => !p.hecho) ?? null;
}
