import { inject } from '@angular/core';
import { LanguageService } from '../../core/services/language.service';
import { formatoFecha, formatoNumero, formatoPesos } from '../../shared/format';

/** Formato y descarga comunes a los dos reportes */
export abstract class ReportBase {
  protected readonly lang = inject(LanguageService);

  pesos(v: number | null | undefined): string { return formatoPesos(v, this.lang.current()); }
  numero(v: number | null | undefined, dec = 0): string { return formatoNumero(v, this.lang.current(), dec); }
  fecha(v: string | null | undefined): string { return formatoFecha(v, this.lang.current()); }

  fechaHora(v: string | null | undefined): string {
    if (!v) return '—';
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? '—'
      : new Intl.DateTimeFormat(this.lang.current() === 'en' ? 'en-US' : 'es-CO',
          { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(d);
  }

  protected descargar(blob: Blob, nombre: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
