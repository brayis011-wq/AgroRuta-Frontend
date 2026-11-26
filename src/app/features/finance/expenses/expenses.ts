import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { forkJoin } from 'rxjs';
import { GastosService } from '../../../core/services/finance.service';
import { FincaActivaService } from '../../../core/services/active-farm.service';
import {
  CATEGORIAS_GASTO,
  CategoriaGasto,
  GastoFinca,
  ResumenGastos,
} from '../../../core/models/finance.model';
import { ConfirmService } from '../../../shared/confirm-dialog/confirm.service';
import { AvisosService } from '../../../core/services/toast.service';
import { FechaPipe, PesosPipe } from '../../../shared/format.pipe';
import { ClavePeriodo, rangoPeriodo } from '../../../core/services/report.service';

/** Icono de cada categoría */
export const ICONO_CATEGORIA: Record<CategoriaGasto, string> = {
  TRANSPORTE: 'ti-truck',
  HERRAMIENTAS: 'ti-tool',
  SERVICIOS: 'ti-bolt',
  MANTENIMIENTO: 'ti-hammer',
  ADMINISTRACION: 'ti-briefcase',
  IMPUESTOS: 'ti-building-bank',
  OTRO: 'ti-dots',
};

interface FormGasto {
  id: number | null;
  fincaId: number | null;
  fecha: string;
  categoria: CategoriaGasto;
  descripcion: string;
  monto: number | null;
}

const hoyIso = () => new Date().toLocaleDateString('en-CA');

/** Gastos de la finca que no son de una siembra: transporte, herramientas, servicios… */
@Component({
  selector: 'app-gastos',
  standalone: true,
  imports: [FormsModule, RouterLink, TranslatePipe, PesosPipe, FechaPipe],
  templateUrl: './expenses.html',
  styleUrls: [
    '../../crop/crop-ui.css',
    '../../crop/crop-blocks.css',
    '../../report/report-table.css',
    '../../worker/worker-ui.css',
    '../../worker/worker-panel.css',
    '../../../shared/styles/opciones.css',
    '../finance.css',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GastosComponent implements OnInit {
  private readonly gastos = inject(GastosService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmService);
  private readonly avisos = inject(AvisosService);
  private readonly translate = inject(TranslateService);
  readonly fincaActiva = inject(FincaActivaService);

  readonly lista = signal<GastoFinca[] | null>(null);
  readonly resumen = signal<ResumenGastos | null>(null);
  readonly periodo = signal<ClavePeriodo>('mes');
  readonly fincaFiltro = signal<number | null>(null);
  readonly error = signal<string | null>(null);
  readonly form = signal<FormGasto | null>(null);
  readonly guardando = signal(false);
  readonly errorPanel = signal<string | null>(null);

  readonly categorias = CATEGORIAS_GASTO;
  readonly icono = ICONO_CATEGORIA;
  readonly periodos: ClavePeriodo[] = ['mes', 'doce', 'anio', 'todo'];
  readonly hoy = hoyIso();

  readonly maxCategoria = computed(() =>
    Math.max(1, ...(this.resumen()?.porCategoria ?? []).map((p) => p.total)),
  );

  ngOnInit(): void {
    this.cargar();
    // Desde el buscador ("Registrar gasto"): ?nuevo=1 abre el formulario
    if (this.route.snapshot.queryParamMap?.get('nuevo') === '1') {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { nuevo: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
      this.nuevo();
    }
  }

  cargar(): void {
    const { desde, hasta } = rangoPeriodo(this.periodo());
    forkJoin({
      lista: this.gastos.listar(this.fincaFiltro(), desde, hasta),
      resumen: this.gastos.resumen(desde, hasta),
    }).subscribe({
      next: ({ lista, resumen }) => {
        this.lista.set(lista);
        this.resumen.set(resumen);
        this.error.set(null);
      },
      error: () => {
        this.lista.set([]);
        this.error.set('gastos.errors.load');
      },
    });
  }

  elegirPeriodo(p: ClavePeriodo): void {
    this.periodo.set(p);
    this.cargar();
  }

  elegirFinca(id: number | null): void {
    this.fincaFiltro.set(id);
    this.cargar();
  }

  nuevo(): void {
    this.errorPanel.set(null);
    const fincas = this.fincaActiva.fincas();
    const finca =
      this.fincaFiltro() ??
      this.fincaActiva.activa()?.id ??
      (fincas.length === 1 ? (fincas[0].id ?? null) : null);
    this.form.set({
      id: null,
      fincaId: finca ?? null,
      fecha: this.hoy,
      categoria: 'TRANSPORTE',
      descripcion: '',
      monto: null,
    });
  }

  editar(g: GastoFinca): void {
    this.errorPanel.set(null);
    this.form.set({
      id: g.id ?? null,
      fincaId: g.fincaId,
      fecha: g.fecha,
      categoria: g.categoria,
      descripcion: g.descripcion,
      monto: g.monto,
    });
  }

  campo<K extends keyof FormGasto>(k: K, v: FormGasto[K]): void {
    const f = this.form();
    if (f) this.form.set({ ...f, [k]: v });
  }

  guardar(): void {
    const f = this.form();
    if (!f) return;
    if (!f.fincaId || !f.fecha || !f.descripcion.trim() || !f.monto || f.monto <= 0) {
      this.errorPanel.set('gastos.errors.incomplete');
      return;
    }
    const g: GastoFinca = {
      fincaId: f.fincaId,
      fecha: f.fecha,
      categoria: f.categoria,
      descripcion: f.descripcion.trim(),
      monto: Number(f.monto),
    };
    this.guardando.set(true);
    const op = f.id ? this.gastos.actualizar(f.id, g) : this.gastos.crear(g);
    op.subscribe({
      next: () => {
        this.guardando.set(false);
        this.form.set(null);
        this.avisos.exito('gastos.saved');
        this.cargar();
      },
      error: (e) => {
        this.guardando.set(false);
        this.errorPanel.set(e?.error?.message || 'gastos.errors.save');
      },
    });
  }

  async eliminar(g: GastoFinca): Promise<void> {
    if (g.id == null) return;
    const ok = await this.confirm.preguntar({
      mensaje: this.translate.instant('gastos.confirmDelete', { what: g.descripcion }),
      peligro: true,
    });
    if (!ok) return;
    this.gastos
      .eliminar(g.id)
      .subscribe({
        next: () => this.cargar(),
        error: () => this.error.set('gastos.errors.delete'),
      });
  }

  esCategoria(clave: string): clave is CategoriaGasto {
    return (CATEGORIAS_GASTO as string[]).includes(clave);
  }

  iconoDe(clave: string): string {
    return this.esCategoria(clave) ? ICONO_CATEGORIA[clave] : 'ti-dots';
  }
}
