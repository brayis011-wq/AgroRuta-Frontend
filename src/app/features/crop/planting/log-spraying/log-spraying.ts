// src/app/features/crop/planting/log-spraying/log-spraying.ts

import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
  signal,
  computed,
} from '@angular/core';
import { AvisosService } from '../../../../core/services/toast.service';
import { CommonModule }           from '@angular/common';
import { FormsModule }            from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  Subject,
  debounceTime,
  forkJoin,
  switchMap,
  of,
  takeUntil,
  catchError,
} from 'rxjs';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { CultivoService }           from '../../../../core/services/crop.service';
import { AgriculturalInputService } from '../../../../core/services/agricultural-input.service';
import { AgriculturalInput, MeasurementUnit } from '../../../../core/models/agricultural-input.model';
import { InventarioService } from '../../../../core/services/inventory.service';
import { LanguageService } from '../../../../core/services/language.service';
import {
  CostoEstimado, StockInsumo, formatoCantidad, unidadBaseDe, unidadGrande, unidadesDe,
} from '../../../../core/models/inventory.model';

/** Un producto de la bodega del agricultor, con su ficha del catálogo (dosis, reentrada, carencia) si sigue activa */
export interface InsumoBodega {
  stock: StockInsumo;
  insumo: AgriculturalInput | null;
}

/** Cuántas unidades base (ml o g) hay en cada unidad */
const FACTOR_BASE: Record<MeasurementUnit, number> = { LITROS: 1000, ML: 1, KG: 1000, GRAMOS: 1 };

/** Sin tildes ni mayúsculas, para que "fungicida" encuentre "Fungicída" */
const normalizar = (t: string | null | undefined): string =>
  (t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

interface FumigacionForm {
  fecha: string;
  producto: string;
  agriculturalInputId: number | undefined;
  dosis: number | undefined;
  unidadMedida: MeasurementUnit | '';
  areaAplicada: number | undefined;
  observaciones: string;
  siembraId: number;
  /** Días sin cosechar después de aplicar (etiqueta del producto) */
  diasCarencia: number | null;
  /** Horas sin entrar al lote después de aplicar */
  reentradaHoras: number | null;
  /** Costo del producto aplicado (COP) */
  costo: number | null;
  /** Producto gastado en total (se descuenta de la bodega); la dosis es una concentración */
  cantidadUsada: number | null;
  unidadCantidad: MeasurementUnit | '';
}

@Component({
  selector: 'app-registrar-fumigacion',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslatePipe],
  templateUrl: './log-spraying.html',
  styleUrls: ['../../crop-form.css', './log-spraying.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegistrarFumigacion implements OnInit, OnDestroy {
  private readonly avisos = inject(AvisosService);

  private readonly route      = inject(ActivatedRoute);
  private readonly router     = inject(Router);
  private readonly cdr        = inject(ChangeDetectorRef);
  private readonly cultivoSvc = inject(CultivoService);
  private readonly inputSvc: AgriculturalInputService = inject(AgriculturalInputService);
  private readonly translate = inject(TranslateService);
  private readonly inventario = inject(InventarioService);
  private readonly lang = inject(LanguageService);

  /** Lo que hay en bodega del insumo elegido y el costo de la cantidad usada a precio promedio */
  estimado = signal<CostoEstimado | null>(null);
  private readonly estimar$ = new Subject<void>();

  siembraId!: number;
  /** Id de la fumigación cuando se está editando */
  registroId: number | null = null;
  cargando = false;
  error    = '';   // clave de traducción (o mensaje crudo del backend)
  exito    = '';   // clave de traducción

  // ── Insumos de la bodega: lo único que se ofrece (no todo el catálogo) ──
  /** Productos con movimientos en la bodega del agricultor, por nombre */
  bodega         = signal<InsumoBodega[]>([]);
  cargandoBodega = signal(true);

  // ── Búsqueda rápida (dentro de la bodega) ────────────────────
  busquedaProducto = '';
  catalogoFiltrado   = signal<InsumoBodega[]>([]);
  mostrarCatalogo    = signal(false);
  insumoSeleccionado = signal<AgriculturalInput | null>(null);

  // ── Lista completa de la bodega ──────────────────────────────
  mostrarBodega = signal(false);
  filtroBodega  = '';

  tipoBadgeClass = computed(() =>
    this.getTipoBadgeClass(this.insumoSeleccionado()?.tipo ?? '')
  );

  form: FumigacionForm = {
    fecha: '',
    producto: '',
    agriculturalInputId: undefined,
    dosis: undefined,
    unidadMedida: '',
    areaAplicada: undefined,
    observaciones: '',
    siembraId: 0,
    diasCarencia: null,
    reentradaHoras: null,
    costo: null,
    cantidadUsada: null,
    unidadCantidad: '',
  };

  readonly unidades: MeasurementUnit[] = ['LITROS', 'ML', 'GRAMOS', 'KG'];

  /**
   * Una sola unidad para la dosis y para la cantidad total (antes se elegían por separado y podían quedar
   * en litros y en kilos a la vez). Con un producto de la bodega, solo las de su tipo: g/kg o ml/L.
   */
  unidadesDisponibles(): MeasurementUnit[] {
    const insumo = this.insumoSeleccionado();
    if (!insumo) return this.unidades;
    const delTipo = unidadesDe(unidadBaseDe(insumo.unidadSugerida));
    // Un registro viejo con otra unidad la conserva en la lista para no perderla al editar
    const actual = this.form.unidadMedida;
    return actual && !delTipo.includes(actual) ? [...delTipo, actual] : delTipo;
  }

  /** La cantidad total usa la misma unidad que la dosis */
  cambiarUnidad(): void {
    this.form.unidadCantidad = this.form.unidadMedida;
    this.actualizarEstimado();
  }

  private readonly destroy$  = new Subject<void>();

  // ── Lifecycle ────────────────────────────────────────────────
  ngOnInit(): void {
    this.siembraId      = Number(this.route.snapshot.paramMap.get('id'));
    this.form.siembraId = this.siembraId;
    this.form.fecha     = new Date().toLocaleDateString('en-CA');

    const registro = this.route.snapshot.paramMap.get('registroId');
    if (registro) {
      this.registroId = Number(registro);
      this.cargarParaEditar(this.registroId);
    }

    this.cargarBodega();

    // Bodega: lo disponible y el costo de la cantidad usada (sin cantidad se pide con 0 para ver lo disponible)
    this.estimar$
      .pipe(
        debounceTime(250),
        switchMap(() => {
          const insumo = this.insumoSeleccionado();
          const unidad = this.form.unidadCantidad;
          if (!insumo || !unidad) return of(null);
          const cantidad = Number(this.form.cantidadUsada) > 0 ? Number(this.form.cantidadUsada) : 0;
          return this.inventario.costoEstimado(insumo.id, cantidad, unidad).pipe(catchError(() => of(null)));
        }),
        takeUntil(this.destroy$)
      )
      .subscribe((e) => {
        this.estimado.set(e);
        this.cdr.markForCheck();
      });
  }

  /** Llena el formulario con la fumigación guardada (y su insumo del catálogo, si tenía) */
  private cargarParaEditar(id: number): void {
    this.cultivoSvc.buscarFumigacion(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (f) => {
        this.form = {
          ...this.form,
          fecha: f.fecha,
          producto: f.producto,
          agriculturalInputId: f.agriculturalInputId ?? undefined,
          dosis: f.dosis,
          unidadMedida: f.unidadMedida,
          areaAplicada: f.areaAplicada,
          observaciones: f.observaciones ?? '',
          diasCarencia: f.diasCarencia ?? null,
          reentradaHoras: f.reentradaHoras ?? null,
          costo: f.costo ?? null,
          cantidadUsada: f.cantidadUsada ?? null,
          unidadCantidad: f.unidadCantidad ?? '',
        };
        this.busquedaProducto = f.producto;
        this.cdr.markForCheck();
        if (f.agriculturalInputId) {
          this.inputSvc.getById(f.agriculturalInputId).pipe(takeUntil(this.destroy$)).subscribe({
            next: (insumo) => {
              this.insumoSeleccionado.set(insumo);
              this.unificarUnidades();
              this.actualizarEstimado();
              this.cdr.markForCheck();
            },
            error: () => { /* el insumo ya no está en el catálogo: queda como texto */ },
          });
        }
      },
      error: () => {
        this.error = 'temporadas.registro.errors.load';
        this.cdr.markForCheck();
      },
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Bodega ───────────────────────────────────────────────────
  /**
   * Trae lo que hay en la bodega y le suma la ficha del catálogo de cada producto.
   * Si el catálogo falla, la lista sale igual (sin dosis sugerida).
   */
  private cargarBodega(): void {
    this.cargandoBodega.set(true);
    forkJoin({
      stock: this.inventario.stock(),
      catalogo: this.inputSvc.getAll().pipe(catchError(() => of<AgriculturalInput[]>([]))),
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ stock, catalogo }) => {
          const fichas = new Map(catalogo.map((i) => [i.id, i]));
          this.bodega.set(
            stock
              .map((s): InsumoBodega => ({ stock: s, insumo: fichas.get(s.insumoId) ?? null }))
              .sort((a, b) => a.stock.nombre.localeCompare(b.stock.nombre)),
          );
          this.cargandoBodega.set(false);
          this.cdr.markForCheck();
        },
        error: () => {
          this.error = 'siembra.spray.errors.loadStock';
          this.cargandoBodega.set(false);
          this.cdr.markForCheck();
        },
      });
  }

  /** "2,5 L" o "750 g" que quedan de ese producto */
  cantidadDe(b: InsumoBodega): string {
    return formatoCantidad(b.stock.cantidad, b.stock.unidadBase, this.locale());
  }

  private coincide(b: InsumoBodega, texto: string): boolean {
    const q = normalizar(texto);
    if (!q) return true;
    const tipo = b.stock.tipo ?? '';
    return normalizar(b.stock.nombre).includes(q)
      || normalizar(tipo).includes(q)
      || (!!tipo && normalizar(this.translate.instant('enums.tipoInsumo.' + tipo) as string).includes(q));
  }

  // ── Búsqueda rápida ──────────────────────────────────────────
  onBusquedaChange(): void {
    if (!this.busquedaProducto.trim()) {
      this.catalogoFiltrado.set([]);
      this.mostrarCatalogo.set(false);
      return;
    }
    this.catalogoFiltrado.set(this.bodega().filter((b) => this.coincide(b, this.busquedaProducto)));
    // También se abre sin resultados, para avisar que ese producto no está en la bodega
    this.mostrarCatalogo.set(true);
  }

  /** Elige un producto de la bodega; si su ficha del catálogo ya no está activa, se arma con lo que hay */
  seleccionarDeBodega(b: InsumoBodega): void {
    this.seleccionarInsumo(b.insumo ?? {
      id: b.stock.insumoId,
      nombre: b.stock.nombre,
      tipo: (b.stock.tipo ?? '') as AgriculturalInput['tipo'],
      tipoDisplay: '',
      unidadSugerida: unidadGrande(b.stock.unidadBase),
      dosisSugerida: 0,
      reentradaHoras: 0,
      diasCarencia: null,
      activo: false,
      creadoEn: '',
    });
    this.mostrarBodega.set(false);
  }

  seleccionarInsumo(insumo: AgriculturalInput): void {
    this.insumoSeleccionado.set(insumo);
    this.busquedaProducto         = insumo.nombre;
    this.form.producto            = insumo.nombre;
    this.form.agriculturalInputId = insumo.id;
    this.form.unidadMedida        = insumo.unidadSugerida;
    this.form.dosis               = insumo.dosisSugerida || undefined;
    this.form.reentradaHoras      = insumo.reentradaHoras || null;
    this.form.diasCarencia        = insumo.diasCarencia ?? null;
    this.form.cantidadUsada       = null;
    this.form.unidadCantidad      = insumo.unidadSugerida;
    this.mostrarCatalogo.set(false);
    this.actualizarEstimado();
  }

  limpiarInsumo(): void {
    this.insumoSeleccionado.set(null);
    this.busquedaProducto         = '';
    this.form.producto            = '';
    this.form.agriculturalInputId = undefined;
    this.form.unidadMedida        = '';
    this.form.dosis               = undefined;
    this.form.reentradaHoras      = null;
    this.form.diasCarencia        = null;
    this.form.cantidadUsada       = null;
    this.form.unidadCantidad      = '';
    this.estimado.set(null);
  }

  // ── Bodega de insumos ────────────────────────────────────────
  actualizarEstimado(): void {
    this.estimar$.next();
  }

  /**
   * Fumigación guardada antes de unificar las unidades (p. ej. dosis en gramos y cantidad en kilos):
   * la cantidad se pasa a la unidad de la dosis. Si son de tipos distintos (dato viejo inconsistente)
   * no se toca, para no cambiar lo que se descontó de la bodega.
   */
  private unificarUnidades(): void {
    const dosis = this.form.unidadMedida;
    const cantidad = this.form.unidadCantidad;
    if (!dosis) return;
    if (!cantidad) { this.form.unidadCantidad = dosis; return; }
    if (cantidad === dosis || unidadBaseDe(cantidad) !== unidadBaseDe(dosis)) return;
    if (this.form.cantidadUsada != null) {
      this.form.cantidadUsada = Math.round(this.form.cantidadUsada * FACTOR_BASE[cantidad] / FACTOR_BASE[dosis] * 1000) / 1000;
    }
    this.form.unidadCantidad = dosis;
  }

  usarCostoEstimado(): void {
    const e = this.estimado();
    if (e?.costo != null) this.form.costo = e.costo;
  }

  cantidadBodega(e: CostoEstimado): string {
    return formatoCantidad(e.disponible, e.unidadBase, this.locale());
  }

  pesos(v: number): string {
    return new Intl.NumberFormat(this.locale(), { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);
  }

  private locale(): string {
    return this.lang.current() === 'en' ? 'en-US' : 'es-CO';
  }

  usarProductoManual(): void {
    if (!this.insumoSeleccionado()) {
      this.form.producto            = this.busquedaProducto;
      this.form.agriculturalInputId = undefined;
    }
    this.mostrarCatalogo.set(false);
  }

  // ── Lista completa de la bodega ──────────────────────────────
  verBodega(): void {
    this.mostrarBodega.set(!this.mostrarBodega());
  }

  /** Productos de la bodega agrupados por tipo, con el filtro de la lista aplicado */
  getBodegaAgrupada(): { tipo: string; items: InsumoBodega[] }[] {
    const label = (tipo: string) =>
      tipo ? (this.translate.instant('enums.tipoInsumo.' + tipo) as string) : '';

    // Se agrupa por la clave del enum (no por el nombre traducido)
    const grupos = this.bodega()
      .filter((b) => this.coincide(b, this.filtroBodega))
      .reduce((acc, b) => {
        (acc[b.stock.tipo ?? ''] ??= []).push(b);
        return acc;
      }, {} as Record<string, InsumoBodega[]>);

    return Object.entries(grupos)
      .map(([tipo, items]) => ({ tipo, items }))
      .sort((a, b) => label(a.tipo).localeCompare(label(b.tipo)));
  }

  // ── Submit ───────────────────────────────────────────────────
  onSubmit(): void {
    if (!this.form.producto?.trim()) {
      this.error = 'siembra.spray.errors.productRequired';
      return;
    }
    if (!this.form.unidadMedida) {
      this.error = 'siembra.spray.errors.unitRequired';
      return;
    }
    this.error    = '';
    this.exito    = '';
    this.cargando = true;

    const payload = {
      fecha:               this.form.fecha,
      producto:            this.form.producto,
      agriculturalInputId: this.form.agriculturalInputId,
      dosis:               this.form.dosis!,
      unidadMedida:        this.form.unidadMedida as MeasurementUnit,
      areaAplicada:        this.form.areaAplicada!,
      observaciones:       this.form.observaciones,
      siembraId:           this.form.siembraId,
      diasCarencia:        this.form.diasCarencia,
      reentradaHoras:      this.form.reentradaHoras,
      costo:               this.form.costo,
      // Solo con producto de la bodega se descuenta de ella
      cantidadUsada:       this.form.agriculturalInputId && Number(this.form.cantidadUsada) > 0 ? Number(this.form.cantidadUsada) : null,
      unidadCantidad:      this.form.agriculturalInputId && Number(this.form.cantidadUsada) > 0 ? (this.form.unidadCantidad || null) : null,
    };

    const peticion = this.registroId
      ? this.cultivoSvc.actualizarFumigacion(this.registroId, payload)
      : this.cultivoSvc.registrarFumigacion(payload);
    peticion
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.cargando = false;
          this.exito    = this.registroId ? 'temporadas.registro.saved' : 'siembra.spray.success';
          this.cdr.markForCheck();
          this.avisos.exito(this.registroId ? 'avisos.saved' : 'avisos.spray');
          this.router.navigate(['/crops/planting', this.siembraId]);
        },
        error: (err: { error?: { message?: string } }) => {
          this.cargando = false;
          this.error    = err.error?.message ?? 'siembra.spray.errors.register';
          this.cdr.markForCheck();
        },
      });
  }

  volver(): void {
    this.router.navigate(['/crops/planting', this.siembraId]);
  }

  // ── Helpers ──────────────────────────────────────────────────
  getTipoBadgeClass(tipo: string): string {
    const map: Record<string, string> = {
      FUNGICIDA:             'badge-fungicida',
      INSECTICIDA:           'badge-insecticida',
      ACARICIDA:             'badge-acaricida',
      NEMATICIDA:            'badge-nematicida',
      HERBICIDA:             'badge-herbicida',
      FERTILIZANTE_FOLIAR:   'badge-fertilizante',
      FERTILIZANTE_SUELO:    'badge-fertilizante-suelo',
      REGULADOR_CRECIMIENTO: 'badge-regulador',
      COADYUVANTE:           'badge-coadyuvante',
    };
    return map[tipo] ?? 'badge-default';
  }
}
