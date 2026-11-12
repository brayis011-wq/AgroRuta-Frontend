import { ConsejoClima } from '../../../core/models/weather.model';

/** Traductor: clave + parámetros → texto */
export type Traducir = (clave: string, params?: Record<string, unknown>) => string;

export interface TextoConsejo {
  titulo: string;
  detalle: string;
  icono: string;
}

const ICONOS: Record<ConsejoClima['tipo'], string> = {
  NO_FUMIGAR: 'ti-spray',
  FUMIGAR_EN_VENTANA: 'ti-clock-hour-9',
  FUMIGAR_BIEN: 'ti-circle-check',
  NO_REGAR: 'ti-droplet-off',
  HELADA: 'ti-snowflake',
  LLUVIA_FUERTE: 'ti-cloud-storm',
};

/** "2026-11-10T16:00:00" → "4 p. m." (es) o "4 PM" (en). Sin pasar por Date: la hora ya viene en hora de Colombia */
export function horaCorta(fechaHora: string | null | undefined, idioma: string): string {
  const m = /T(\d{2}):(\d{2})/.exec(fechaHora ?? '');
  if (!m) return '';
  const h = Number(m[1]);
  const min = m[2] === '00' ? '' : ':' + m[2];
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const sufijo = idioma === 'en' ? (h < 12 ? ' AM' : ' PM') : h < 12 ? ' a. m.' : ' p. m.';
  return h12 + min + sufijo;
}

/** Horas que faltan desde {@code ahora} hasta {@code fechaHora} (ambas "yyyy-MM-ddTHH:mm" en la misma zona); 0 si ya empezó */
export function horasHasta(fechaHora: string | null | undefined, ahora: string): number | null {
  if (!fechaHora) return null;
  const a = Date.parse(fechaHora.slice(0, 16) + ':00Z');
  const b = Date.parse(ahora.slice(0, 16) + ':00Z');
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.max(0, Math.round((a - b) / 3_600_000));
}

/** La hora de Colombia de este momento, como "2026-11-10T14:05" */
export function ahoraEnColombia(d = new Date()): string {
  // sv-SE da "2026-11-10 14:05:00": el mismo orden que usa el servidor
  return d.toLocaleString('sv-SE', { timeZone: 'America/Bogota' }).replace(' ', 'T').slice(0, 16);
}

/** Arma el texto de un consejo: qué hacer (título) y por qué (detalle) */
export function textoConsejo(c: ConsejoClima, ahora: string, idioma: string, t: Traducir): TextoConsejo {
  const hoy = ahora.slice(0, 10);
  const dia = (fecha: string | null) => t(fecha && fecha.slice(0, 10) > hoy ? 'weather.advice.tomorrow' : 'weather.advice.today');
  const hora = horaCorta(c.problemaDesde, idioma);
  const faltan = horasHasta(c.problemaDesde, ahora);
  const mismoDia = !!c.problemaDesde && c.problemaDesde.slice(0, 10) === hoy;

  // "Lluvia en 3 horas (4 p. m.)", "Lluvia ahora", "Lluvia mañana desde las 7 a. m."
  const causa = (): string => {
    const motivo = t('weather.advice.reason.' + (c.motivo ?? 'LLUVIA'));
    if (!c.problemaDesde || faltan === null) return motivo + '.';
    if (!mismoDia) return t('weather.advice.whyTomorrow', { motivo, hora });
    if (faltan === 0) return t('weather.advice.whyNow', { motivo });
    return t(faltan === 1 ? 'weather.advice.whyInOne' : 'weather.advice.whyIn', { motivo, n: faltan, hora });
  };
  const ventana = c.ventanaInicio && c.ventanaFin
    ? { dia: dia(c.ventanaInicio), desde: horaCorta(c.ventanaInicio, idioma), hasta: horaCorta(c.ventanaFin, idioma) }
    : null;
  const mm = Math.round(c.valor ?? 0);
  const icono = ICONOS[c.tipo];

  switch (c.tipo) {
    case 'NO_FUMIGAR':
      return { icono, titulo: t('weather.advice.noSpray', { dia: dia(c.dia) }),
        detalle: causa() + (ventana ? ' ' + t('weather.advice.better', ventana) : '') };
    case 'FUMIGAR_EN_VENTANA':
      return { icono, titulo: ventana ? t('weather.advice.sprayWindow', ventana) : t('weather.advice.sprayOk', { dia: dia(c.dia) }),
        detalle: causa() };
    case 'FUMIGAR_BIEN':
      return { icono, titulo: t('weather.advice.sprayOk', { dia: dia(c.dia) }), detalle: t('weather.advice.sprayOkSub') };
    case 'NO_REGAR':
      return { icono, titulo: t('weather.advice.noWater'),
        detalle: t(hora ? 'weather.advice.noWaterSubAt' : 'weather.advice.noWaterSub', { mm, hora }) };
    case 'HELADA':
      return { icono, titulo: t('weather.advice.frost'),
        detalle: t(hora ? 'weather.advice.frostSubAt' : 'weather.advice.frostSub', { temp: Math.round(c.valor ?? 0), hora }) };
    case 'LLUVIA_FUERTE':
      return { icono, titulo: t('weather.advice.heavyRain'),
        detalle: t(hora ? 'weather.advice.heavyRainSubAt' : 'weather.advice.heavyRainSub', { mm, hora }) };
  }
}
