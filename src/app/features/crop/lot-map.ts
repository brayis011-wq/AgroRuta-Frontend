import { Lote } from '../../core/models/crop.model';

export type EstadoLote = Lote['estado'];

/** Color de cada estado del lote en los mapas (el mismo en el detalle de la finca y en el mapa de todas) */
export const COLOR_ESTADO_LOTE: Record<string, string> = {
  EN_CULTIVO: '#2e7d32',
  DISPONIBLE: '#1f5fa8',
  EN_DESCANSO: '#b26a00',
};

/** Los estados en el orden de la leyenda */
export const ESTADOS_LOTE = ['EN_CULTIVO', 'DISPONIBLE', 'EN_DESCANSO'] as const;

export function colorEstadoLote(estado: string | null | undefined): string {
  return COLOR_ESTADO_LOTE[estado ?? ''] ?? COLOR_ESTADO_LOTE['EN_CULTIVO'];
}

/** Las coordenadas guardadas ("[[lat, lng], ...]") como puntos del mapa; null si no sirven para un polígono */
export function puntosDelLote(coordenadas: string | null | undefined): [number, number][] | null {
  if (!coordenadas) return null;
  try {
    const crudos: unknown = JSON.parse(coordenadas);
    if (!Array.isArray(crudos)) return null;
    const puntos = crudos
      .filter((p): p is [number, number] => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1]))
      .map((p) => [p[0], p[1]] as [number, number]);
    return puntos.length >= 3 ? puntos : null;
  } catch {
    return null;
  }
}
