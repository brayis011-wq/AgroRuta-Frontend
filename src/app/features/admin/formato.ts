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
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return '—';
  return new Intl.DateTimeFormat(localeDe(lang), { day: 'numeric', month: 'short', year: 'numeric' }).format(fecha);
}
