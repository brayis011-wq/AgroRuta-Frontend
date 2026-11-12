import { FilaCostos } from '../costs/costs-calc';

/** Una temporada del lote con sus números de rentabilidad */
export interface TemporadaLote {
  siembraId: number;
  nombre: string;
  fechaSiembra: string;
  fechaFin: string | null;
  enCurso: boolean;
  eliminada: boolean;
  costo: number;
  ingresos: number;
  kg: number;
  /** null si ninguna cosecha tiene precio de venta */
  ganancia: number | null;
  /** Ganancia ÷ ingresos × 100; null sin ventas */
  margen: number | null;
  /** Ganancia ÷ costo × 100: cuánto dejó cada peso invertido; null sin costos o sin ventas */
  retorno: number | null;
  /** null si el lote no tiene área */
  gananciaPorHa: number | null;
  kgPorHa: number | null;
  /** Cambio de la ganancia frente a la temporada anterior del mismo lote (pesos); null si no se puede comparar */
  cambio: number | null;
  /** El mismo cambio en porcentaje; null si la anterior fue 0 o no se puede comparar */
  cambioPct: number | null;
}

export interface RentabilidadLote {
  clave: string;
  loteNombre: string;
  fincaNombre: string | null;
  areaHa: number | null;
  /** De la más reciente a la más antigua */
  temporadas: TemporadaLote[];
  costo: number;
  ingresos: number;
  ganancia: number | null;
  margen: number | null;
  gananciaPorHa: number | null;
  /** La temporada con mayor ganancia (solo si hay al menos dos con ganancia calculada) */
  mejorId: number | null;
}

export interface ResumenRentabilidad {
  lotes: number;
  ganancia: number | null;
  margen: number | null;
  mejorLote: RentabilidadLote | null;
  peorLote: RentabilidadLote | null;
}

const pct = (parte: number, total: number): number | null => (total > 0 ? (parte / total) * 100 : null);

/** Agrupa las temporadas por lote y compara cada una con la anterior del mismo lote */
export function rentabilidadPorLote(filas: FilaCostos[]): RentabilidadLote[] {
  const grupos = new Map<string, FilaCostos[]>();
  for (const f of filas) {
    if (!f.costos) continue;
    // Las siembras antiguas no traen loteId: se agrupan por nombre de finca y lote
    const clave = f.siembra.loteId != null ? 'id' + f.siembra.loteId : `n${f.siembra.fincaNombre ?? ''}|${f.siembra.loteNombre ?? ''}`;
    grupos.set(clave, [...(grupos.get(clave) ?? []), f]);
  }

  const lotes: RentabilidadLote[] = [];
  for (const [clave, grupo] of grupos) {
    const area = grupo.map((f) => f.siembra.loteAreaHa).find((a) => a != null && a > 0) ?? null;
    const antiguaPrimero = [...grupo].sort((a, b) => (a.siembra.fechaSiembra ?? '').localeCompare(b.siembra.fechaSiembra ?? ''));
    const temporadas: TemporadaLote[] = [];
    let anterior: TemporadaLote | null = null;
    for (const f of antiguaPrimero) {
      const c = f.costos!;
      const ganancia = c.ganancia;
      const previa: number | null = anterior ? anterior.ganancia : null;
      const cambio: number | null = ganancia != null && previa != null ? ganancia - previa : null;
      const t: TemporadaLote = {
        siembraId: f.siembra.siembraId,
        nombre: f.siembra.variedad,
        fechaSiembra: f.siembra.fechaSiembra,
        fechaFin: f.siembra.fechaFin ?? null,
        enCurso: f.siembra.estado !== 'FINALIZADO',
        eliminada: !!f.siembra.eliminada,
        costo: c.costoTotal,
        ingresos: c.ingresos,
        kg: c.kgTotal,
        ganancia,
        margen: ganancia != null ? pct(ganancia, c.ingresos) : null,
        retorno: ganancia != null ? pct(ganancia, c.costoTotal) : null,
        gananciaPorHa: ganancia != null && area ? ganancia / area : null,
        kgPorHa: area && c.kgTotal > 0 ? c.kgTotal / area : null,
        cambio,
        cambioPct: cambio != null && previa ? (cambio / Math.abs(previa)) * 100 : null,
      };
      temporadas.push(t);
      anterior = t;
    }

    const costo = temporadas.reduce((s, t) => s + t.costo, 0);
    const ingresos = temporadas.reduce((s, t) => s + t.ingresos, 0);
    const conGanancia = temporadas.filter((t) => t.ganancia != null);
    const ganancia = conGanancia.length ? ingresos - costo : null;
    const mejor = conGanancia.length > 1 ? conGanancia.reduce((m, t) => (t.ganancia! > m.ganancia! ? t : m)) : null;
    lotes.push({
      clave,
      loteNombre: grupo[0].siembra.loteNombre ?? '—',
      fincaNombre: grupo[0].siembra.fincaNombre ?? null,
      areaHa: area,
      temporadas: temporadas.reverse(),
      costo, ingresos, ganancia,
      margen: ganancia != null ? pct(ganancia, ingresos) : null,
      gananciaPorHa: ganancia != null && area ? ganancia / area : null,
      mejorId: mejor?.siembraId ?? null,
    });
  }
  // Primero los lotes que más dejaron; al final los que no tienen ventas
  return lotes.sort((a, b) => (b.ganancia ?? Number.NEGATIVE_INFINITY) - (a.ganancia ?? Number.NEGATIVE_INFINITY));
}

export function resumenRentabilidad(lotes: RentabilidadLote[]): ResumenRentabilidad {
  const con = lotes.filter((l) => l.ganancia != null);
  const ingresos = con.reduce((s, l) => s + l.ingresos, 0);
  const ganancia = con.length ? con.reduce((s, l) => s + l.ganancia!, 0) : null;
  return {
    lotes: lotes.length,
    ganancia,
    margen: ganancia != null ? pct(ganancia, ingresos) : null,
    mejorLote: con[0] ?? null,
    peorLote: con.length > 1 ? con[con.length - 1] : null,
  };
}

/** Ancho de la barra (0–100) de una temporada frente a la mayor ganancia o pérdida del lote */
export function anchoBarra(t: TemporadaLote, lote: RentabilidadLote): number {
  const max = Math.max(...lote.temporadas.map((x) => Math.abs(x.ganancia ?? 0)));
  return max > 0 && t.ganancia != null ? Math.max(4, Math.round((Math.abs(t.ganancia) / max) * 100)) : 0;
}
