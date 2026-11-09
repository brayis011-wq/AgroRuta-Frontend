import { Weather } from '../core/models/weather.model';
import { Finca } from '../core/models/crop.model';

export type ConsejoClima = 'good' | 'rain' | 'wind' | 'hot';

/** Viento máximo recomendado para fumigar: 4 m/s (≈ 15 km/h); la API da m/s */
const VIENTO_MAX = 4;

/**
 * Consejo práctico para el día según el clima actual.
 * Códigos de OpenWeather: 09 llovizna, 10 lluvia, 11 tormenta.
 */
export function consejoFumigacion(w: Weather): ConsejoClima {
  const codigo = /(\d{2})[dn]/.exec(w.iconUrl?.split('/').pop() ?? '')?.[1];
  if (codigo === '09' || codigo === '10' || codigo === '11') return 'rain';
  if (w.windSpeed > VIENTO_MAX) return 'wind';
  if (w.temperature >= 30) return 'hot';
  return 'good';
}

/** Municipio de una ubicación "Vereda, Municipio, Departamento" */
export function municipio(f: Pick<Finca, 'ubicacion'> | null | undefined): string {
  const partes = (f?.ubicacion ?? '').split(',').map((p) => p.trim()).filter(Boolean);
  return partes.length >= 2 ? partes[partes.length - 2] : (partes[0] ?? '');
}
