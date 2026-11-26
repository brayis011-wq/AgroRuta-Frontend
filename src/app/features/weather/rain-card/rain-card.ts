import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { CampoService } from '../../../core/services/finance.service';
import { ResumenLluvia } from '../../../core/models/finance.model';
import { LanguageService } from '../../../core/services/language.service';
import { AvisosService } from '../../../core/services/toast.service';
import { formatoNumero, localeDe } from '../../../shared/format';
import { mensajeDeError } from '../../../shared/error-message';

/** "aaaa-mm-dd" local */
function isoLocal(d: Date): string {
  return d.toLocaleDateString('en-CA');
}

/** Con esta lluvia en los últimos 3 días, regar no hace falta */
export const MM_SIN_RIEGO = 15;

/** Qué sugiere la lluvia reciente: no regar, regar o nada que decir */
export function consejoLluvia(r: ResumenLluvia | null, hoy: string): 'noRegar' | 'seco' | null {
  if (!r) return null;
  const [y, m, d] = hoy.split('-').map(Number);
  const desde = new Date(y, m - 1, d - 2);
  const tres = r.dias
    .filter((d) => d.fecha >= isoLocal(desde) && d.fecha <= hoy)
    .reduce((s, d) => s + Number(d.milimetros), 0);
  if (tres >= MM_SIN_RIEGO) return 'noRegar';
  if (r.diasSinLluvia != null && r.diasSinLluvia >= 7 && r.dias.length > 0) return 'seco';
  return null;
}

/**
 * Lluvia de la finca: lo que marcó el pluviómetro. Se anota con un toque (hoy o ayer) y muestra
 * las últimas dos semanas, para decidir riegos y fumigaciones junto al pronóstico.
 */
@Component({
  selector: 'app-lluvia-finca',
  standalone: true,
  imports: [FormsModule, TranslatePipe],
  templateUrl: './rain-card.html',
  styleUrl: './rain-card.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LluviaFincaComponent {
  private readonly campo = inject(CampoService);
  private readonly lang = inject(LanguageService);
  private readonly avisos = inject(AvisosService);

  readonly fincaId = input.required<number>();
  /** Versión pequeña (en el Inicio): cifras en una línea, barras bajitas y el formulario más chico */
  readonly compacta = input(false);
  readonly nombre = input<string | null>(null);

  readonly resumen = signal<ResumenLluvia | null>(null);
  readonly hoy = isoLocal(new Date());
  readonly ayer = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return isoLocal(d);
  })();
  readonly dia = signal<string>(this.hoy);
  milimetros: number | null = null;
  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);

  /** Las últimas 14 barras (los días sin dato salen vacíos) */
  readonly barras = computed(() => {
    const r = this.resumen();
    const porDia = new Map((r?.dias ?? []).map((d) => [d.fecha, Number(d.milimetros)]));
    const lista: { fecha: string; mm: number | null; alto: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const f = isoLocal(d);
      lista.push({ fecha: f, mm: porDia.has(f) ? porDia.get(f)! : null, alto: 0 });
    }
    const max = Math.max(10, ...lista.map((x) => x.mm ?? 0));
    return lista.map((x) => ({ ...x, alto: x.mm ? Math.max(6, (x.mm / max) * 100) : 0 }));
  });

  readonly consejo = computed(() => consejoLluvia(this.resumen(), this.hoy));
  readonly yaAnotado = computed(
    () => (this.resumen()?.dias ?? []).find((d) => d.fecha === this.dia()) ?? null,
  );

  constructor() {
    effect(() => this.cargar(this.fincaId()));
  }

  private cargar(id: number): void {
    const desde = new Date();
    desde.setDate(desde.getDate() - 29);
    this.campo.lluvia(id, isoLocal(desde), this.hoy).subscribe({
      next: (r) => this.resumen.set(r),
      error: () => this.resumen.set(null),
    });
  }

  anotar(): void {
    if (this.milimetros == null || this.milimetros < 0) return;
    this.guardando.set(true);
    this.error.set(null);
    this.campo.anotarLluvia(this.fincaId(), this.dia(), Number(this.milimetros)).subscribe({
      next: () => {
        this.guardando.set(false);
        this.milimetros = null;
        this.avisos.exito('lluvia.saved');
        this.cargar(this.fincaId());
      },
      error: (e) => {
        this.guardando.set(false);
        this.error.set(mensajeDeError(e, 'lluvia.errors.save'));
      },
    });
  }

  /** "No llovió" anota 0 mm */
  sinLluvia(): void {
    this.milimetros = 0;
    this.anotar();
  }

  mm(v: number | null | undefined): string {
    return formatoNumero(v ?? 0, this.lang.current(), 1).replace(/[.,]0$/, '');
  }

  etiquetaDia(fecha: string): string {
    const [y, m, d] = fecha.split('-').map(Number);
    return new Intl.DateTimeFormat(localeDe(this.lang.current()), {
      weekday: 'short',
      day: 'numeric',
    }).format(new Date(y, m - 1, d));
  }
}
