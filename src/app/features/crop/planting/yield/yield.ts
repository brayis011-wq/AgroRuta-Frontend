import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageService } from '../../../../core/services/language.service';
import { formatoNumero, localeDe } from '../../../../shared/format';
import { ResumenSiembra, Siembra, nombreCultivo } from '../../../../core/models/crop.model';
import { barrasSemanas, comparacion, partesCalidad } from './yield.logic';

/** Cosechas por semana, rendimiento y comparación con las temporadas anteriores del lote */
@Component({
  selector: 'app-rendimiento-siembra',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  templateUrl: './yield.html',
  styleUrl: './yield.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RendimientoSiembraComponent {
  private lang = inject(LanguageService);

  readonly resumen = input<ResumenSiembra | null>(null);
  readonly siembra = input.required<Siembra>();

  readonly barras = computed(() => barrasSemanas(this.resumen()?.semanas ?? []));
  readonly maxSemana = computed(() => Math.max(0, ...this.barras().map((b) => b.total)));
  readonly calidad = computed(() => {
    const r = this.resumen();
    return r ? partesCalidad(r) : { primera: 0, segunda: 0, tercera: 0 };
  });
  readonly comp = computed(() => {
    const r = this.resumen();
    const s = this.siembra();
    if (!r || !s.id) return { filas: [], porPlanta: false };
    return comparacion(r, { id: s.id, nombre: nombreCultivo(s), desde: s.fechaSiembra, plantas: s.cantidadPlantas });
  });
  /** Etiqueta cada N semanas para que no se amontonen */
  readonly paso = computed(() => Math.max(1, Math.ceil(this.barras().length / 8)));

  num(v: number | null | undefined, dec = 0): string {
    return formatoNumero(v, this.lang.current(), dec);
  }

  /** "12 oct" */
  dia(iso: string | null): string {
    if (!iso) return '';
    const [y, m, d] = iso.split('-').map(Number);
    return new Intl.DateTimeFormat(localeDe(this.lang.current()), { day: 'numeric', month: 'short' }).format(new Date(y, m - 1, d));
  }

  /** "oct 2025" */
  mes(iso: string | null): string {
    if (!iso) return '';
    const [y, m] = iso.split('-').map(Number);
    return new Intl.DateTimeFormat(localeDe(this.lang.current()), { month: 'short', year: 'numeric' }).format(new Date(y, m - 1, 1));
  }
}
