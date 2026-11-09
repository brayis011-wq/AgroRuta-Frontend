import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { CultivoService } from '../../../../core/services/crop.service';
import { LanguageService } from '../../../../core/services/language.service';
import { formatoNumero, formatoPesos, localeDe } from '../../../../shared/format';
import { CostosSiembra } from '../../../../core/models/crop.model';

/** Cuánto costó y cuánto dejó la temporada */
@Component({
  selector: 'app-costos-siembra',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './costs.html',
  styleUrl: './costs.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CostosSiembraComponent {
  private cultivo = inject(CultivoService);
  private lang = inject(LanguageService);

  readonly siembraId = input.required<number>();
  /** Cambia cuando se registra o borra algo, para recargar */
  readonly version = input(0);

  readonly costos = signal<CostosSiembra | null>(null);
  readonly error = signal(false);

  /** Partes del costo en % para la barra */
  readonly partes = computed(() => {
    const c = this.costos();
    const t = c?.costoTotal ?? 0;
    const p = (v: number) => (t > 0 ? (v / t) * 100 : 0);
    return c ? { manoObra: p(c.manoObra), insumos: p(c.insumos), otros: p(c.otros) } : null;
  });

  /** Meses con barras de costo e ingreso escaladas al mayor valor */
  readonly meses = computed(() => {
    const m = this.costos()?.meses ?? [];
    const costo = (x: CostosSiembra['meses'][number]) => x.manoObra + x.insumos + x.otros;
    const max = Math.max(0, ...m.map((x) => Math.max(costo(x), x.ingresos)));
    return m.slice(-6).map((x) => ({
      mes: x.mes, costo: costo(x), ingresos: x.ingresos,
      anchoCosto: max ? (costo(x) / max) * 100 : 0, anchoIngreso: max ? (x.ingresos / max) * 100 : 0,
    }));
  });

  constructor() {
    effect(() => {
      const id = this.siembraId();
      this.version();
      this.cultivo.costosSiembra(id).subscribe({
        next: (c) => { this.costos.set(c); this.error.set(false); },
        error: () => this.error.set(true),
      });
    });
  }

  pesos(v: number | null | undefined): string {
    return formatoPesos(v, this.lang.current());
  }

  num(v: number | null | undefined, d = 0): string {
    return formatoNumero(v, this.lang.current(), d);
  }

  nombreMes(mes: string): string {
    const [y, m] = mes.split('-').map(Number);
    const nombre = new Intl.DateTimeFormat(localeDe(this.lang.current()), { month: 'short' }).format(new Date(y, m - 1, 1)).replace('.', '');
    return `${nombre} ${String(y).slice(2)}`;
  }
}
