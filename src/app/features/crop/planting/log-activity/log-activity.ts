import { UltimoUsadoService } from '../../../../core/services/last-used.service';
import { SiguienteCampoDirective } from '../../../../shared/next-field.directive';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  ChangeDetectorRef,
  inject,
  HostListener,
} from '@angular/core';
import { AvisosService } from '../../../../core/services/toast.service';

import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { MigasCultivoComponent } from '../../../../shared/breadcrumbs/crop-breadcrumbs';
import { CultivoService } from '../../../../core/services/crop.service';
import { InventarioService } from '../../../../core/services/inventory.service';
import { LanguageService } from '../../../../core/services/language.service';
import {
  CostoEstimado,
  StockInsumo,
  formatoCantidad,
  unidadGrande,
  unidadesDe,
} from '../../../../core/models/inventory.model';
import { MeasurementUnit } from '../../../../core/models/agricultural-input.model';
import { formatoPesos } from '../../../../shared/format';
import { TranslateService } from '@ngx-translate/core';
import { Subject, catchError, debounceTime, of, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-registrar-actividad',
  standalone: true,
  imports: [FormsModule, RouterLink, TranslatePipe, MigasCultivoComponent, SiguienteCampoDirective],
  templateUrl: './log-activity.html',
  styleUrls: ['../../crop-form.css', '../../crop-form-actions.css', './log-activity.css'],
})
export class RegistrarActividad implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cultivoService = inject(CultivoService);
  private readonly cdr = inject(ChangeDetectorRef);

  private readonly avisos = inject(AvisosService);

  siembraId!: number;
  /** Id de la actividad cuando se está editando */
  registroId: number | null = null;
  cargando = false;
  error = ''; // clave de traducción (o mensaje crudo del backend)
  exito = ''; // clave de traducción

  form: any = {
    tipo: '',
    descripcion: '',
    fecha: '',
    siembraId: 0,
    costo: null as number | null,
    producto: '' as string,
    agriculturalInputId: null as number | null,
    cantidadUsada: null as number | null,
    unidadCantidad: null as MeasurementUnit | null,
  };

  tiposActividad = ['ABONADO', 'PODA', 'TUTOREO', 'DESHIERBE', 'RIEGO', 'REVISION', 'OTRO'];

  tipoIconos: Record<string, string> = {
    ABONADO: 'ti-seeding',
    PODA: 'ti-scissors',
    TUTOREO: 'ti-line-dashed',
    DESHIERBE: 'ti-plant-off',
    RIEGO: 'ti-droplet',
    REVISION: 'ti-zoom-check',
    OTRO: 'ti-dots',
  };

  private readonly ultimo = inject(UltimoUsadoService);

  // ── Insumo de la bodega que gastó la actividad (abonado, fertilización al suelo...) ──
  private readonly inventario = inject(InventarioService);
  private readonly lang = inject(LanguageService);
  private readonly translate = inject(TranslateService);
  /** Lo que hay en la bodega: primero los fertilizantes */
  bodega: StockInsumo[] = [];
  /** Se abrió la sección del insumo (en el abonado sale abierta) */
  conInsumo = false;
  /** Lo que costaría a precio promedio de compra */
  estimado: CostoEstimado | null = null;
  private readonly estimar$ = new Subject<void>();
  private readonly suscripcionEstimado = this.estimar$
    .pipe(
      debounceTime(300),
      switchMap(() => {
        const f = this.form;
        if (!f.agriculturalInputId || !f.cantidadUsada || f.cantidadUsada <= 0 || !f.unidadCantidad)
          return of(null);
        return this.inventario
          .costoEstimado(f.agriculturalInputId, Number(f.cantidadUsada), f.unidadCantidad)
          .pipe(catchError(() => of(null)));
      }),
      takeUntilDestroyed(),
    )
    .subscribe((e) => {
      this.estimado = e;
      this.cdr.detectChanges();
    });

  get insumoElegido(): StockInsumo | null {
    return this.bodega.find((b) => b.insumoId === this.form.agriculturalInputId) ?? null;
  }

  /** Unidades que tienen sentido con el producto (kilos y gramos, o litros y mililitros) */
  get unidades(): MeasurementUnit[] {
    const b = this.insumoElegido;
    return b ? unidadesDe(b.unidadBase) : ['KG', 'GRAMOS', 'LITROS', 'ML'];
  }

  elegirTipo(tipo: string): void {
    this.form.tipo = tipo;
    if (tipo === 'ABONADO') this.conInsumo = true;
  }

  elegirInsumo(id: number | string | null): void {
    const b = this.bodega.find((x) => x.insumoId === Number(id)) ?? null;
    this.form.agriculturalInputId = b ? b.insumoId : null;
    if (b) {
      this.form.producto = b.nombre;
      this.form.unidadCantidad = unidadGrande(b.unidadBase);
      // Si no hay descripción, se propone una con el producto
      if (!this.form.descripcion?.trim()) {
        this.form.descripcion = this.translate.instant(
          'siembra.activity.supply.defaultDescription',
          { product: b.nombre },
        );
      }
    }
    this.estimar();
  }

  quitarInsumo(): void {
    this.conInsumo = false;
    this.form = {
      ...this.form,
      producto: '',
      agriculturalInputId: null,
      cantidadUsada: null,
      unidadCantidad: null,
    };
    this.estimado = null;
  }

  estimar(): void {
    this.estimar$.next();
  }

  disponible(b: StockInsumo): string {
    return formatoCantidad(
      b.cantidad,
      b.unidadBase,
      this.lang.current() === 'en' ? 'en-US' : 'es-CO',
    );
  }

  pesos(v: number | null | undefined): string {
    return formatoPesos(v ?? 0, this.lang.current());
  }

  /** La cantidad pasa de lo que hay en la bodega (se puede guardar igual: queda en negativo) */
  get pasaDeLaBodega(): boolean {
    const e = this.estimado;
    if (!e || !this.form.cantidadUsada) return false;
    const usada =
      Number(this.form.cantidadUsada) *
      (this.form.unidadCantidad === 'KG' || this.form.unidadCantidad === 'LITROS' ? 1000 : 1);
    return usada > e.disponible + 0.001;
  }

  // ── Cambios sin guardar: cuenta solo lo que escribe o elige la persona (no lo que la app rellena sola) ──
  private tocado = false;
  private guardado = false;

  @HostListener('input')
  @HostListener('change')
  alEditar(): void {
    this.tocado = true;
  }

  tieneCambios(): boolean {
    return this.tocado && !this.guardado;
  }

  ngOnInit(): void {
    this.siembraId = Number(this.route.snapshot.paramMap.get('id'));
    this.form.siembraId = this.siembraId;
    this.form.fecha = new Date().toLocaleDateString('en-CA');
    // Desde el calendario se puede programar para otro día: ?fecha=2026-11-12
    const fechaQuery = this.route.snapshot.queryParamMap?.get('fecha');
    if (fechaQuery && /^\d{4}-\d{2}-\d{2}$/.test(fechaQuery)) this.form.fecha = fechaQuery;

    this.inventario.stock().subscribe({
      next: (s) => {
        const fert = (b: StockInsumo) => ((b.tipo ?? '').startsWith('FERTILIZANTE') ? 0 : 1);
        this.bodega = [...s].sort((a, b) => fert(a) - fert(b) || a.nombre.localeCompare(b.nombre));
        this.cdr.detectChanges();
      },
      error: () => {
        /* sin bodega: se puede escribir el producto a mano */
      },
    });

    const registro = this.route.snapshot.paramMap.get('registroId');
    // Una actividad nueva empieza con el tipo de la anterior (en temporada se repite la misma labor)
    if (!registro)
      this.form.tipo = this.ultimo.leer<{ tipo?: string }>('actividad')?.tipo ?? this.form.tipo;
    // Desde una labor que se repite: ?tipo=DESHIERBE
    const tipoQuery = this.route.snapshot.queryParamMap?.get('tipo');
    if (!registro && tipoQuery && /^[A-Z]+$/.test(tipoQuery)) this.form.tipo = tipoQuery;
    // Lo programado como "Fertilizar" se registra como abonado
    if (!registro && this.form.tipo === 'FERTILIZACION') this.form.tipo = 'ABONADO';
    if (!registro && this.form.tipo === 'ABONADO') this.conInsumo = true;
    if (registro) {
      this.registroId = Number(registro);
      this.cultivoService.buscarActividad(this.registroId).subscribe({
        next: (a) => {
          this.form = {
            ...this.form,
            tipo: a.tipo,
            descripcion: a.descripcion,
            fecha: a.fecha,
            costo: a.costo ?? null,
            producto: a.producto ?? '',
            agriculturalInputId: a.agriculturalInputId ?? null,
            cantidadUsada: a.cantidadUsada ?? null,
            unidadCantidad: a.unidadCantidad ?? null,
          };
          this.conInsumo = !!(a.producto || a.agriculturalInputId) || a.tipo === 'ABONADO';
          this.estimar();
          this.cdr.detectChanges();
        },
        error: () => {
          this.error = 'temporadas.registro.errors.load';
          this.cdr.detectChanges();
        },
      });
    }
  }

  onSubmit(): void {
    this.error = '';
    this.exito = '';
    this.cargando = true;

    // Sin la sección del insumo abierta no se manda producto (y si tenía, vuelve a la bodega)
    const f = this.form;
    const datos =
      this.conInsumo && (f.producto?.trim() || f.agriculturalInputId)
        ? {
            ...f,
            producto: f.producto?.trim() || null,
            cantidadUsada: f.cantidadUsada ? Number(f.cantidadUsada) : null,
            unidadCantidad: f.cantidadUsada ? f.unidadCantidad : null,
          }
        : {
            ...f,
            producto: null,
            agriculturalInputId: null,
            cantidadUsada: null,
            unidadCantidad: null,
          };
    if (datos.cantidadUsada && !datos.unidadCantidad) {
      this.error = 'siembra.activity.supply.unitRequired';
      this.cargando = false;
      return;
    }
    const peticion = this.registroId
      ? this.cultivoService.actualizarActividad(this.registroId, datos)
      : this.cultivoService.registrarActividad(datos);
    peticion.subscribe({
      next: (guardado: { id?: number } | null | void) => {
        this.cargando = false;
        this.guardado = true;
        if (this.form.tipo) this.ultimo.guardar('actividad', { tipo: this.form.tipo });
        this.exito = this.registroId ? 'temporadas.registro.saved' : 'siembra.activity.success';
        this.cdr.detectChanges();
        this.avisos.exito(this.registroId ? 'avisos.saved' : 'avisos.activity');
        // Al volver, la ficha baja hasta el registro y lo marca un momento
        const id = (guardado && guardado.id) || this.registroId;
        this.router.navigate(['/crops/planting', this.siembraId], {
          queryParams: { tab: 'registros', nuevo: id ? 'actividad-' + id : null },
        });
      },
      error: (err) => {
        this.cargando = false;
        this.error = err.error?.message || 'siembra.activity.errors.register';
        this.cdr.detectChanges();
      },
    });
  }
}
