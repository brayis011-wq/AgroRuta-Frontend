import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { JornalService } from '../../../core/services/worker.service';
import { RendimientoTrabajador } from '../../../core/models/worker.model';
import { PesosPipe } from '../../../shared/format.pipe';
import { LanguageService } from '../../../core/services/language.service';
import { formatoNumero } from '../../../shared/format';

type Periodo = 30 | 90 | 365;

/** Qué conviene con un trabajador: lo que sale el kilo pagándole por día frente a pagarle por kilo */
export interface Comparacion {
  /** DIA o KILO: la forma más barata; IGUAL si casi no hay diferencia */
  mejor: 'DIA' | 'KILO' | 'IGUAL';
  /** Pesos de diferencia por kilo */
  diferencia: number;
  /** El valor del kilo con que se compara viene del equipo (el trabajador no tiene días al kilo) */
  delEquipo: boolean;
}

const iso = (d: Date) => d.toLocaleDateString('en-CA');

/**
 * Compara el costo del kilo pagando por día con el de pagar por kilo (el del mismo trabajador o, si no tiene
 * días al kilo, el promedio del equipo). null si no hay con qué comparar.
 */
export function comparar(r: RendimientoTrabajador, kiloEquipo: number | null): Comparacion | null {
  const porDia = r.costoKiloPorDia;
  const porKilo = r.costoKiloPorKilo ?? kiloEquipo;
  if (porDia == null || porKilo == null || porKilo <= 0) return null;
  const diferencia = Math.round(Math.abs(porDia - porKilo));
  const mejor = diferencia <= porKilo * 0.02 ? 'IGUAL' : porDia < porKilo ? 'DIA' : 'KILO';
  return { mejor, diferencia, delEquipo: r.costoKiloPorKilo == null };
}

/** Rendimiento: cuántos kilos recoge cada trabajador y cuánto sale el kilo pagando por día o por kilo */
@Component({
  selector: 'app-rendimiento',
  standalone: true,
  imports: [TranslatePipe, PesosPipe, RouterLink],
  templateUrl: './yield.html',
  styleUrls: [
    '../../crop/crop-ui.css',
    '../../crop/crop-blocks.css',
    '../../report/report-table.css',
    '../worker-ui.css',
    './yield.css',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RendimientoComponent implements OnInit {
  private readonly jornales = inject(JornalService);
  private readonly lang = inject(LanguageService);

  /** Kilos con una cifra decimal como se escriben en el idioma activo (47,5) */
  kg(v: number | null | undefined): string {
    const n = Number(v ?? 0);
    return formatoNumero(n, this.lang.current(), Number.isInteger(n) ? 0 : 1);
  }

  readonly periodos: Periodo[] = [30, 90, 365];
  readonly periodo = signal<Periodo>(90);
  readonly lista = signal<RendimientoTrabajador[] | null>(null);
  readonly error = signal(false);

  /** Lo que se paga en promedio el kilo a quienes cobran por kilo (para comparar a los que cobran por día) */
  readonly kiloEquipo = computed(() => {
    const l = this.lista() ?? [];
    const kilos = l.reduce((s, r) => s + r.kilosPorKilo, 0);
    const pagado = l.reduce((s, r) => s + r.pagadoPorKilo, 0);
    return kilos > 0 ? Math.round(pagado / kilos) : null;
  });

  readonly totalKilos = computed(() =>
    (this.lista() ?? []).reduce((s, r) => s + r.kilosPorDia + r.kilosPorKilo, 0),
  );
  readonly totalPagado = computed(() =>
    (this.lista() ?? []).reduce((s, r) => s + r.pagadoPorDia + r.pagadoPorKilo, 0),
  );
  readonly costoKilo = computed(() =>
    this.totalKilos() > 0 ? Math.round(this.totalPagado() / this.totalKilos()) : null,
  );

  // ── Gráficas ──

  /** De más a menos kilos al día (solo quien tiene días con kilos) */
  readonly porKilos = computed(() =>
    (this.lista() ?? [])
      .filter((r) => r.kilosAlDia != null)
      .sort((a, b) => (b.kilosAlDia ?? 0) - (a.kilosAlDia ?? 0)),
  );
  readonly maxKilos = computed(() => Math.max(0, ...this.porKilos().map((r) => r.kilosAlDia ?? 0)));

  /** Quien tiene algún costo del kilo, del más caro al más barato */
  readonly conCosto = computed(() =>
    (this.lista() ?? [])
      .filter((r) => r.costoKiloPorDia != null || r.costoKiloPorKilo != null)
      .sort(
        (a, b) =>
          Math.max(b.costoKiloPorDia ?? 0, b.costoKiloPorKilo ?? 0) -
          Math.max(a.costoKiloPorDia ?? 0, a.costoKiloPorKilo ?? 0),
      ),
  );
  readonly maxCosto = computed(() =>
    Math.max(
      0,
      this.kiloEquipo() ?? 0,
      ...this.conCosto().map((r) => Math.max(r.costoKiloPorDia ?? 0, r.costoKiloPorKilo ?? 0)),
    ),
  );

  /** Ancho de la barra en % (hasta 80%: el resto es para la cifra al final), con un mínimo para que se vea */
  ancho(valor: number | null | undefined, max: number): number {
    if (!valor || max <= 0) return 0;
    return Math.max(2, Math.round((valor / max) * 800) / 10);
  }

  ngOnInit(): void {
    this.cargar();
  }

  elegir(p: Periodo): void {
    if (p === this.periodo()) return;
    this.periodo.set(p);
    this.cargar();
  }

  cargar(): void {
    const hoy = new Date();
    const desde = new Date(hoy);
    desde.setDate(hoy.getDate() - (this.periodo() - 1));
    this.lista.set(null);
    this.jornales.rendimiento(iso(desde), iso(hoy)).subscribe({
      next: (l) => {
        this.lista.set(l);
        this.error.set(false);
      },
      error: () => {
        this.lista.set([]);
        this.error.set(true);
      },
    });
  }

  comparacion(r: RendimientoTrabajador): Comparacion | null {
    return comparar(r, this.kiloEquipo());
  }
}
