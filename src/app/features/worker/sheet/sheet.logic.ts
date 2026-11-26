import { CasillaPlanilla, FilaPlanilla } from '../../../core/services/worker.service';

/** "2026-11-16" con la fecha local (no UTC) */
export function isoLocal(d: Date): string {
  const dos = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
}

/** "2026-11-16" → Date a medianoche local */
export function deIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** El lunes de la semana de esa fecha */
export function lunesDe(d: Date): Date {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dia = (r.getDay() + 6) % 7; // lunes = 0
  r.setDate(r.getDate() - dia);
  return r;
}

/** Los 7 días (aaaa-mm-dd) desde el lunes */
export function diasDeSemana(lunes: Date): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(lunes);
    d.setDate(d.getDate() + i);
    return isoLocal(d);
  });
}

export function sumarDias(iso: string, dias: number): string {
  const d = deIso(iso);
  d.setDate(d.getDate() + dias);
  return isoLocal(d);
}

/** Se puede quitar si no está pagado y su nómina (si tiene) sigue pendiente: la nómina se recalcula */
export function sePuedeQuitar(j: CasillaPlanilla): boolean {
  return !j.liquidado && (!j.enNomina || j.nominaEstado === 'PENDIENTE');
}

/** Ya no se puede cambiar: su nómina se aprobó o se pagó */
export function bloqueado(j: CasillaPlanilla): boolean {
  return !sePuedeQuitar(j);
}

/** Jornales por trabajador y día: clave "trabajadorId|fecha" */
export function indexar(jornales: CasillaPlanilla[]): Map<string, CasillaPlanilla[]> {
  const m = new Map<string, CasillaPlanilla[]>();
  for (const j of jornales) {
    const k = clave(j.trabajadorId, j.fecha);
    const lista = m.get(k);
    if (lista) lista.push(j);
    else m.set(k, [j]);
  }
  return m;
}

export function clave(trabajadorId: number, fecha: string): string {
  return `${trabajadorId}|${fecha}`;
}

export interface TotalFila {
  jornales: number;
  kilos: number;
  valor: number;
}

/** Lo de cada trabajador en la semana */
export function totalFila(t: FilaPlanilla, jornales: CasillaPlanilla[]): TotalFila {
  const suyos = jornales.filter((j) => j.trabajadorId === t.id);
  return {
    jornales: suyos.length,
    kilos: suyos.reduce((s, j) => s + (j.kilos ?? 0), 0),
    valor: suyos.reduce((s, j) => s + (j.valor ?? 0), 0),
  };
}

/** Cuántos trabajaron cada día */
export function totalDia(fecha: string, jornales: CasillaPlanilla[]): number {
  return new Set(jornales.filter((j) => j.fecha === fecha).map((j) => j.trabajadorId)).size;
}

/**
 * De los jornales de una casilla, el que se quita al tocarla: el del cultivo elegido si lo hay,
 * si no el último; nunca uno que ya está en nómina. null si no se puede quitar ninguno.
 */
export function porQuitar(
  casilla: CasillaPlanilla[],
  cultivoId: number | null,
): CasillaPlanilla | null {
  const libres = casilla.filter(sePuedeQuitar);
  if (!libres.length) return null;
  return libres.find((j) => j.cultivoId === cultivoId) ?? libres[libres.length - 1];
}
