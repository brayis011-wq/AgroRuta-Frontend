// src/app/features/cultivo/siembra/registrar-fumigacion/registrar-fumigacion.ts

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
import { CommonModule }           from '@angular/common';
import { FormsModule }            from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  Subject,
  debounceTime,
  distinctUntilChanged,
  switchMap,
  of,
  takeUntil,
  catchError,
} from 'rxjs';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { CultivoService }           from '../../../../core/services/cultivo.service';
import { AgriculturalInputService } from '../../../../core/services/AgriculturalInput.service';
import { AgriculturalInput, MeasurementUnit } from '../../../../core/models/AgriculturalInput.model';

interface FumigacionForm {
  fecha: string;
  producto: string;
  agriculturalInputId: number | undefined;
  dosis: number | undefined;
  unidadMedida: MeasurementUnit | '';
  areaAplicada: number | undefined;
  observaciones: string;
  siembraId: number;
}

@Component({
  selector: 'app-registrar-fumigacion',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './registrar-fumigacion.html',
  styleUrl: './registrar-fumigacion.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegistrarFumigacion implements OnInit, OnDestroy {

  private readonly route      = inject(ActivatedRoute);
  private readonly router     = inject(Router);
  private readonly cdr        = inject(ChangeDetectorRef);
  private readonly cultivoSvc = inject(CultivoService);
  private readonly inputSvc: AgriculturalInputService = inject(AgriculturalInputService);
  private readonly translate = inject(TranslateService);

  siembraId!: number;
  cargando = false;
  error    = '';   // clave de traducción (o mensaje crudo del backend)
  exito    = '';   // clave de traducción

  // ── Búsqueda rápida ──────────────────────────────────────────
  busquedaProducto = '';
  catalogoFiltrado   = signal<AgriculturalInput[]>([]);
  mostrarCatalogo    = signal(false);
  insumoSeleccionado = signal<AgriculturalInput | null>(null);
  cargandoCatalogo   = signal(false);

  // ── Catálogo completo ────────────────────────────────────────
  mostrarCatalogoCompleto = signal(false);
  catalogoCompleto        = signal<AgriculturalInput[]>([]);
  cargandoCompleto        = signal(false);
  filtroCatalogo          = '';                             // ← propiedad que faltaba

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
  };

  readonly unidades: MeasurementUnit[] = ['LITROS', 'ML', 'GRAMOS', 'KG'];

  private readonly busqueda$ = new Subject<string>();
  private readonly destroy$  = new Subject<void>();

  // ── Lifecycle ────────────────────────────────────────────────
  ngOnInit(): void {
    this.siembraId      = Number(this.route.snapshot.paramMap.get('id'));
    this.form.siembraId = this.siembraId;
    this.form.fecha     = new Date().toISOString().split('T')[0];

    this.busqueda$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((query: string) => {
          if (!query.trim()) {
            this.catalogoFiltrado.set([]);
            this.mostrarCatalogo.set(false);
            return of<AgriculturalInput[]>([]);
          }
          this.cargandoCatalogo.set(true);
          return this.inputSvc.search(query).pipe(
            catchError(() => {
              this.error = 'siembra.spray.errors.search';
              return of<AgriculturalInput[]>([]);
            })
          );
        }),
        takeUntil(this.destroy$)
      )
      .subscribe((resultados: AgriculturalInput[]) => {
        this.cargandoCatalogo.set(false);
        this.catalogoFiltrado.set(resultados);
        this.mostrarCatalogo.set(resultados.length > 0);
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Búsqueda rápida ──────────────────────────────────────────
  onBusquedaChange(): void {
    this.busqueda$.next(this.busquedaProducto);
  }

  seleccionarInsumo(insumo: AgriculturalInput): void {
    this.insumoSeleccionado.set(insumo);
    this.busquedaProducto         = insumo.nombre;
    this.form.producto            = insumo.nombre;
    this.form.agriculturalInputId = insumo.id;
    this.form.unidadMedida        = insumo.unidadSugerida;
    this.form.dosis               = insumo.dosisSugerida;
    this.mostrarCatalogo.set(false);
  }

  limpiarInsumo(): void {
    this.insumoSeleccionado.set(null);
    this.busquedaProducto         = '';
    this.form.producto            = '';
    this.form.agriculturalInputId = undefined;
    this.form.unidadMedida        = '';
    this.form.dosis               = undefined;
  }

  usarProductoManual(): void {
    if (!this.insumoSeleccionado()) {
      this.form.producto            = this.busquedaProducto;
      this.form.agriculturalInputId = undefined;
    }
    this.mostrarCatalogo.set(false);
  }

  // ── Catálogo completo ────────────────────────────────────────
  verCatalogoCompleto(): void {
    if (this.mostrarCatalogoCompleto()) {
      this.mostrarCatalogoCompleto.set(false);
      return;
    }

    // Si ya se cargó antes, solo mostrar
    if (this.catalogoCompleto().length > 0) {
      this.mostrarCatalogoCompleto.set(true);
      return;
    }

    this.cargandoCompleto.set(true);
    this.inputSvc.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.catalogoCompleto.set(data);
          this.cargandoCompleto.set(false);
          this.mostrarCatalogoCompleto.set(true);
          this.cdr.markForCheck();
        },
        error: () => {
          this.error = 'siembra.spray.errors.loadCatalog';
          this.cargandoCompleto.set(false);
          this.cdr.markForCheck();
        }
      });
  }

  getCatalogoAgrupado(): { tipo: string; items: AgriculturalInput[] }[] {
    const filtro = this.filtroCatalogo.toLowerCase().trim();
    const label = (tipo: string) =>
      this.translate.instant('enums.tipoInsumo.' + tipo) as string;

    const items = filtro
      ? this.catalogoCompleto().filter(i =>
          i.nombre.toLowerCase().includes(filtro) ||
          i.tipo.toLowerCase().includes(filtro) ||
          label(i.tipo).toLowerCase().includes(filtro)
        )
      : this.catalogoCompleto();

    // Se agrupa por la clave del enum (no por tipoDisplay, que viene del backend en un solo idioma)
    const grupos = items.reduce((acc, item) => {
      (acc[item.tipo] ??= []).push(item);
      return acc;
    }, {} as Record<string, AgriculturalInput[]>);

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
    };

    this.cultivoSvc.registrarFumigacion(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.cargando = false;
          this.exito    = 'siembra.spray.success';
          this.cdr.markForCheck();
          setTimeout(() => this.router.navigate(['/cultivo/siembra', this.siembraId]), 1500);
        },
        error: (err: { error?: { message?: string } }) => {
          this.cargando = false;
          this.error    = err.error?.message ?? 'siembra.spray.errors.register';
          this.cdr.markForCheck();
        },
      });
  }

  volver(): void {
    this.router.navigate(['/cultivo/siembra', this.siembraId]);
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
