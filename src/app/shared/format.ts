// Formato de números y fechas según el idioma activo (es-CO / en-US)

export function localeDe(lang: string): string {
  return lang === 'en' ? 'en-US' : 'es-CO';
}

export function formatoNumero(valor: number | null | undefined, lang: string, decimales = 0): string {
  return new Intl.NumberFormat(localeDe(lang), {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(valor ?? 0);
}

export function formatoPesos(valor: number | null | undefined, lang: string): string {
  return new Intl.NumberFormat(localeDe(lang), {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(valor ?? 0);
}

export function formatoFecha(valor: string | null | undefined, lang: string): string {
  if (!valor) return '—';
  // "2026-10-01" se interpreta como medianoche UTC y en Colombia se vería como el 30 de sept:
  // las fechas sin hora se arman en hora local.
  const soloFecha = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
  const fecha = soloFecha
    ? new Date(Number(soloFecha[1]), Number(soloFecha[2]) - 1, Number(soloFecha[3]))
    : new Date(valor);
  if (Number.isNaN(fecha.getTime())) return '—';
  return new Intl.DateTimeFormat(localeDe(lang), { day: 'numeric', month: 'short', year: 'numeric' }).format(fecha);
}
