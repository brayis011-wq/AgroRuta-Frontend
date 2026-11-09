import { Pipe, PipeTransform, inject } from '@angular/core';
import { LanguageService } from '../core/services/language.service';
import { formatoFecha, formatoPesos, localeDe } from './format';

/** Pesos colombianos según el idioma activo: $ 60.000 */
@Pipe({ name: 'pesos', standalone: true, pure: false })
export class PesosPipe implements PipeTransform {
  private readonly lang = inject(LanguageService);
  transform(v: number | null | undefined): string { return formatoPesos(v, this.lang.current()); }
}

/** Fecha corta según el idioma activo: 3 nov 2026 */
@Pipe({ name: 'fecha', standalone: true, pure: false })
export class FechaPipe implements PipeTransform {
  private readonly lang = inject(LanguageService);
  transform(v: string | Date | null | undefined): string {
    if (v instanceof Date) v = v.toISOString();
    return formatoFecha(v ?? null, this.lang.current());
  }
}

/** Período corto: "16 – 31 oct 2026", "28 sept – 4 oct 2026" o con ambos años si cambian */
@Pipe({ name: 'periodo', standalone: true, pure: false })
export class PeriodoPipe implements PipeTransform {
  private readonly lang = inject(LanguageService);
  transform(inicio: string | Date | null | undefined, fin: string | Date | null | undefined): string {
    const a = aFecha(inicio), b = aFecha(fin);
    if (!a || !b) return '—';
    const loc = localeDe(this.lang.current());
    const dm = new Intl.DateTimeFormat(loc, { day: 'numeric', month: 'short' });
    const dmy = new Intl.DateTimeFormat(loc, { day: 'numeric', month: 'short', year: 'numeric' });
    if (a.getFullYear() !== b.getFullYear()) return `${dmy.format(a)} – ${dmy.format(b)}`;
    if (a.getMonth() === b.getMonth()) return `${a.getDate()} – ${dmy.format(b)}`;
    return `${dm.format(a)} – ${dmy.format(b)}`;
  }
}

function aFecha(v: string | Date | null | undefined): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
  const d = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}
