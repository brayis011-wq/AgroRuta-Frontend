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

const ICONOS_CLIMA: Record<string, [dia: string, noche: string]> = {
  '01': ['ti-sun', 'ti-moon-stars'],
  '02': ['ti-haze', 'ti-moon'],
  '03': ['ti-cloud', 'ti-cloud'],
  '04': ['ti-cloud', 'ti-cloud'],
  '09': ['ti-cloud-rain', 'ti-cloud-rain'],
  '10': ['ti-cloud-rain', 'ti-cloud-rain'],
  '11': ['ti-cloud-storm', 'ti-cloud-storm'],
  '13': ['ti-cloud-snow', 'ti-cloud-snow'],
  '50': ['ti-mist', 'ti-mist'],
};

/**
 * Ícono de la app para el clima, a partir del código de OpenWeather (".../10n@2x.png" → "ti-cloud-rain").
 * Las imágenes de OpenWeather traen mucho borde vacío y una luna oscura de noche: en tamaños pequeños
 * se veían recortadas.
 */
export function iconoClima(iconUrl: string | null | undefined): string {
  const m = /(\d{2})([dn])/.exec(iconUrl?.split('/').pop() ?? '');
  const par = m ? ICONOS_CLIMA[m[1]] : undefined;
  return par ? par[m![2] === 'n' ? 1 : 0] : 'ti-cloud';
}

/** Municipio de una ubicación "Vereda, Municipio, Departamento" */
export function municipio(f: Pick<Finca, 'ubicacion'> | null | undefined): string {
  const partes = (f?.ubicacion ?? '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  return partes.length >= 2 ? partes[partes.length - 2] : (partes[0] ?? '');
}
