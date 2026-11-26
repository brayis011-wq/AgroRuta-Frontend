import { AvisoBandeja } from '../../core/services/inbox.service';
import { formatoFecha, formatoPesos, localeDe } from '../format';

/** Traduce una clave con parámetros (TranslateService.instant) */
export type Traducir = (clave: string, params?: Record<string, unknown>) => string;

export interface TextoAviso {
  titulo: string;
  cuerpo: string;
  icono: string;
  tono: 'verde' | 'azul' | 'ambar' | 'gris';
}

const num = (v: unknown): number => (typeof v === 'number' ? v : Number(v ?? 0)) || 0;
const txt = (v: unknown): string => (v == null ? '' : String(v));

/**
 * El título y el cuerpo de un aviso en el idioma de la persona, a partir de su tipo y sus datos.
 * Si el tipo no se conoce, se usa el texto en español que guardó el servidor.
 */
export function textoAviso(a: AvisoBandeja, t: Traducir, lang: string): TextoAviso {
  const d = a.datos ?? {};
  switch (a.tipo) {
    case 'PAGO_REGISTRADO': {
      const monto = formatoPesos(num(d['monto']), lang);
      const periodo =
        d['inicio'] && d['fin']
          ? t('inbox.period', {
              from: formatoFecha(txt(d['inicio']), lang),
              to: formatoFecha(txt(d['fin']), lang),
            })
          : '';
      return {
        titulo: t('inbox.types.PAGO_REGISTRADO.title'),
        cuerpo:
          t('inbox.types.PAGO_REGISTRADO.body', { amount: monto }) +
          (periodo ? ` · ${periodo}` : ''),
        icono: 'ti-cash',
        tono: 'verde',
      };
    }
    case 'ACCESO_SOLICITADO':
      return {
        titulo: t('inbox.types.ACCESO_SOLICITADO.title'),
        cuerpo: t('inbox.types.ACCESO_SOLICITADO.body', { worker: txt(d['trabajador']) }),
        icono: 'ti-user-check',
        tono: 'azul',
      };
    case 'ACCESO_RESUELTO': {
      const estado = d['aprobado'] ? 'approved' : d['retirado'] ? 'removed' : 'rejected';
      const empleador = txt(d['empleador']) || t('inbox.yourEmployer');
      return {
        titulo: t(`inbox.types.ACCESO_RESUELTO.${estado}.title`),
        cuerpo: t(`inbox.types.ACCESO_RESUELTO.${estado}.body`, { employer: empleador }),
        icono: d['aprobado'] ? 'ti-lock-open' : 'ti-lock',
        tono: d['aprobado'] ? 'verde' : 'gris',
      };
    }
    case 'RESUMEN_DIA': {
      // En español el servidor ya arma el resumen completo (con el consejo del clima); en otros idiomas, con los conteos
      let cuerpo = a.cuerpo;
      if (!lang.startsWith('es')) {
        const partes = (['alertas', 'clima', 'insumos'] as const)
          .filter((k) => num(d[k]) > 0)
          .map((k) => t(`inbox.summary.${k}`, { count: num(d[k]) }));
        cuerpo = partes.length ? partes.join(' · ') : t('inbox.summary.generic');
      }
      return { titulo: t('inbox.types.RESUMEN_DIA.title'), cuerpo, icono: 'ti-sun', tono: 'ambar' };
    }
    default:
      return { titulo: a.titulo, cuerpo: a.cuerpo, icono: 'ti-bell', tono: 'gris' };
  }
}

/** "hace 5 minutos", "ayer", "hace 3 días" */
export function haceCuanto(iso: string, lang: string, ahora = Date.now()): string {
  const seg = Math.round((new Date(iso).getTime() - ahora) / 1000);
  const rtf = new Intl.RelativeTimeFormat(localeDe(lang), { numeric: 'auto' });
  const abs = Math.abs(seg);
  if (abs < 60) return rtf.format(0, 'second');
  if (abs < 3600) return rtf.format(Math.round(seg / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(seg / 3600), 'hour');
  if (abs < 7 * 86400) return rtf.format(Math.round(seg / 86400), 'day');
  return new Intl.DateTimeFormat(localeDe(lang), { day: 'numeric', month: 'short' }).format(
    new Date(iso),
  );
}
