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
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { CampoService, PreciosService } from '../../../../core/services/finance.service';
import { CultivoService } from '../../../../core/services/crop.service';
import { CostosSiembra } from '../../../../core/models/crop.model';
import { PrecioCultivo, Presupuesto } from '../../../../core/models/finance.model';
import { AvisosService } from '../../../../core/services/toast.service';
import { PesosPipe } from '../../../../shared/format.pipe';
import { ConfirmService } from '../../../../shared/confirm-dialog/confirm.service';
import { TranslateService } from '@ngx-translate/core';
import { mensajeDeError } from '../../../../shared/error-message';

/** Ancho de una barra de avance (0 a 100) */
export function avance(gastado: number, presupuesto: number | null): number {
  if (!presupuesto || presupuesto <= 0) return 0;
  return Math.min(100, (gastado / presupuesto) * 100);
}

/**
 * Presupuesto de la temporada frente a lo gastado, y lo que valdrían las cosechas sin precio
 * con el precio de referencia del cultivo.
 */
@Component({
  selector: 'app-presupuesto-siembra',
  standalone: true,
  imports: [FormsModule, RouterLink, TranslatePipe, PesosPipe],
  templateUrl: './budget.html',
  styleUrl: './budget.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PresupuestoSiembraComponent {
  private readonly campo = inject(CampoService);
  private readonly cultivos = inject(CultivoService);
  private readonly precios = inject(PreciosService);
  private readonly avisos = inject(AvisosService);
  private readonly confirm = inject(ConfirmService);
  private readonly translate = inject(TranslateService);

  readonly siembraId = input.required<number>();
  readonly cultivo = input<string | null | undefined>(null);
  readonly variedad = input<string | null | undefined>(null);
  readonly activa = input(true);
  readonly version = input(0);

  readonly presupuesto = signal<Presupuesto | null | undefined>(undefined);
  readonly costos = signal<CostosSiembra | null>(null);
  readonly referencia = signal<PrecioCultivo | null>(null);
  readonly editando = signal(false);
  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);
  form = {
    manoObra: null as number | null,
    insumos: null as number | null,
    otros: null as number | null,
  };

  /** Kilos cosechados que no tienen precio y lo que valdrían con el precio de referencia */
  readonly estimado = computed(() => {
    const c = this.costos(),
      p = this.referencia();
    if (!c) return null;
    const kg = Math.max(0, (c.kgTotal ?? 0) - (c.kgConPrecio ?? 0));
    if (kg <= 0 || !p?.precioKg) return kg > 0 ? { kg, valor: null, ganancia: null } : null;
    const valor = kg * p.precioKg;
    return { kg, valor, ganancia: (c.ingresos ?? 0) + valor - (c.costoTotal ?? 0) };
  });

  readonly partes = computed(() => {
    const p = this.presupuesto();
    if (!p) return [];
    return [
      {
        clave: 'temporadas.costos.labor',
        gastado: p.gastadoManoObra,
        tope: p.manoObra,
        pasado: p.manoObraSuperada,
      },
      {
        clave: 'temporadas.costos.inputs',
        gastado: p.gastadoInsumos,
        tope: p.insumos,
        pasado: p.insumosSuperados,
      },
      {
        clave: 'temporadas.costos.other',
        gastado: p.gastadoOtros,
        tope: p.otros,
        pasado: p.otrosSuperados,
      },
    ].filter((x) => x.tope != null && x.tope > 0);
  });

  readonly avance = avance;

  constructor() {
    effect(() => {
      const id = this.siembraId();
      this.version();
      this.campo.presupuesto(id).subscribe({
        next: (p) => this.presupuesto.set(p ?? null),
        error: () => this.presupuesto.set(null),
      });
      this.cultivos
        .costosSiembra(id)
        .subscribe({ next: (c) => this.costos.set(c), error: () => this.costos.set(null) });
    });
    effect(() => {
      const c = this.cultivo();
      if (!c) return;
      this.precios
        .deCultivo(c, this.variedad())
        .subscribe({ next: (p) => this.referencia.set(p), error: () => this.referencia.set(null) });
    });
  }

  editar(): void {
    const p = this.presupuesto();
    this.form = {
      manoObra: p?.manoObra ?? null,
      insumos: p?.insumos ?? null,
      otros: p?.otros ?? null,
    };
    this.error.set(null);
    this.editando.set(true);
  }

  guardar(): void {
    const total = (this.form.manoObra ?? 0) + (this.form.insumos ?? 0) + (this.form.otros ?? 0);
    if (total <= 0) {
      this.error.set('presupuesto.errors.empty');
      return;
    }
    this.guardando.set(true);
    this.campo.guardarPresupuesto(this.siembraId(), this.form).subscribe({
      next: (p) => {
        this.presupuesto.set(p);
        this.guardando.set(false);
        this.editando.set(false);
        this.avisos.exito('presupuesto.saved');
      },
      error: (e) => {
        this.guardando.set(false);
        this.error.set(mensajeDeError(e, 'presupuesto.errors.save'));
      },
    });
  }

  async borrar(): Promise<void> {
    if (
      !(await this.confirm.preguntar({
        mensaje: this.translate.instant('presupuesto.confirmDelete'),
        peligro: true,
      }))
    )
      return;
    this.campo
      .borrarPresupuesto(this.siembraId())
      .subscribe({ next: () => this.presupuesto.set(null) });
  }
}
