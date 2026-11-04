import { ETAPAS_CULTIVO, EtapaCultivo, EtapaSiembra, Siembra } from '../../../../core/models/cultivo.model';

export interface PasoCiclo {
  etapa: EtapaCultivo;
  estado: 'hecho' | 'actual' | 'pendiente';
  /** Día en que entró en la etapa (si se registró) */
  fecha: string | null;
}

/** "yyyy-MM-dd" de hoy en hora local */
export function hoyIso(hoy = new Date()): string {
  return hoy.toLocaleDateString('en-CA');
}

/** Días entre dos fechas "yyyy-MM-dd" (sin problemas de zona horaria) */
export function diasEntre(desde: string | null | undefined, hasta: string | null | undefined): number {
  if (!desde || !hasta) return 0;
  const a = Date.UTC(+desde.slice(0, 4), +desde.slice(5, 7) - 1, +desde.slice(8, 10));
  const b = Date.UTC(+hasta.slice(0, 4), +hasta.slice(5, 7) - 1, +hasta.slice(8, 10));
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

/** Los cinco pasos del ciclo con su estado y la fecha registrada de cada uno */
export function pasosCiclo(siembra: Siembra, etapas: EtapaSiembra[]): PasoCiclo[] {
  const actual = ETAPAS_CULTIVO.indexOf(siembra.estadoCultivo);
  const fechaDe = (e: EtapaCultivo): string | null => {
    // la última vez que entró en esa etapa (si retrocedió y volvió a avanzar)
    const regs = etapas.filter(r => r.etapa === e);
    if (regs.length) return regs[regs.length - 1].fecha;
    if (e === 'GERMINACION') return siembra.fechaSiembra;
    if (e === 'FINALIZADO') return siembra.fechaFin ?? null;
    return null;
  };
  return ETAPAS_CULTIVO.map((etapa, i) => ({
    etapa,
    estado: i < actual || (i === actual && etapa === 'FINALIZADO') ? 'hecho' : i === actual ? 'actual' : 'pendiente',
    fecha: i <= actual ? fechaDe(etapa) : null,
  }));
}

/** Siguiente etapa a la que se puede pasar con "avanzar" (de Cosecha se pasa con "terminar") */
export function siguienteEtapa(etapa: EtapaCultivo): EtapaCultivo | null {
  const i = ETAPAS_CULTIVO.indexOf(etapa);
  const sig = ETAPAS_CULTIVO[i + 1];
  return sig && sig !== 'FINALIZADO' ? sig : null;
}

/** Fecha mínima para el próximo cambio: el último cambio registrado o la siembra */
export function fechaMinima(siembra: Siembra, etapas: EtapaSiembra[]): string {
  const fechas = etapas.map(e => e.fecha).filter(Boolean).sort();
  return fechas.length ? fechas[fechas.length - 1] : siembra.fechaSiembra;
}

/** Días que lleva en la etapa actual */
export function diasEnEtapa(siembra: Siembra, etapas: EtapaSiembra[], hoy = hoyIso()): number {
  const paso = pasosCiclo(siembra, etapas).find(p => p.etapa === siembra.estadoCultivo);
  return diasEntre(paso?.fecha ?? siembra.fechaSiembra, hoy);
}

/** 0 % en germinación, 100 % al finalizar */
export function progresoCiclo(etapa: EtapaCultivo): number {
  return Math.round((ETAPAS_CULTIVO.indexOf(etapa) / (ETAPAS_CULTIVO.length - 1)) * 100);
}
