import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { InventarioService } from '../../../core/services/inventario.service';
import { AgriculturalInputService } from '../../../core/services/AgriculturalInput.service';
import { AgriculturalInput, MeasurementUnit } from '../../../core/models/AgriculturalInput.model';
import {
  MovimientoInventario, StockInsumo, UnidadBase, enUnidadGrande, formatoCantidad, unidadBaseDe, unidadGrande, unidadesDe,
} from '../../../core/models/inventario.model';
import { ConfirmService } from '../../../shared/confirm-dialog/confirm.service';
import { LanguageService } from '../../../core/services/language.service';

type Panel = 'compra' | 'ajuste' | 'minimo';

/**
 * Bodega de insumos del agricultor: lo que hay de cada producto, cuánto vale y el historial
 * de compras, gastos en fumigaciones y ajustes. El gasto de las fumigaciones se descuenta solo.
 */
@Component({
  selector: 'app-inventario',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe],
  templateUrl: './inventario.html',
  styleUrls: ['../cultivo-ui.css', '../cultivo-bloques.css', '../../report/report-tabla.css', '../../worker/worker-ui.css', '../../worker/worker-panel.css', './inventario.css'],
})
export class InventarioComponent implements OnInit {
  private readonly inventario = inject(InventarioService);
  private readonly insumosService = inject(AgriculturalInputService);
  private readonly confirm = inject(ConfirmService);
  private readonly translate = inject(TranslateService);
  private readonly fb = inject(FormBuilder);
  private readonly lang = inject(LanguageService);

  readonly stock = signal<StockInsumo[] | null>(null);
  readonly catalogo = signal<AgriculturalInput[]>([]);
  readonly error = signal('');
  readonly panel = signal<Panel | null>(null);
  readonly guardando = signal(false);
  readonly errorForm = signal('');
  /** Insumo con el historial abierto */
  readonly abierto = signal<number | null>(null);
  readonly movimientos = signal<MovimientoInventario[]>([]);
  /** Insumo sobre el que se hace el ajuste o el mínimo */
  readonly sobre = signal<StockInsumo | null>(null);

  readonly valorTotal = computed(() => (this.stock() ?? []).reduce((t, s) => t + (s.valorStock ?? 0), 0));
  readonly conAvisos = computed(() => (this.stock() ?? []).filter((s) => s.estado !== 'OK').length);

  readonly compra = this.fb.group({
    insumoId: [null as number | null, Validators.required],
    cantidad: [null as number | null, [Validators.required, Validators.min(0.001)]],
    unidad: ['LITROS' as MeasurementUnit, Validators.required],
    costoTotal: [null as number | null, Validators.min(0)],
    fecha: [this.hoy(), Validators.required],
    proveedor: [''],
    observaciones: [''],
  });

  readonly ajuste = this.fb.group({
    cantidadReal: [null as number | null, [Validators.required, Validators.min(0)]],
    unidad: ['LITROS' as MeasurementUnit, Validators.required],
    observaciones: [''],
  });

  readonly minimo = this.fb.group({
    minimo: [null as number | null, Validators.min(0)],
    unidad: ['LITROS' as MeasurementUnit, Validators.required],
  });

  ngOnInit(): void {
    this.cargar();
    this.insumosService.getAll().subscribe({ next: (l) => this.catalogo.set(l), error: () => this.catalogo.set([]) });
    // La unidad de la compra sigue al insumo elegido (no se mezclan litros con gramos)
    this.compra.controls.insumoId.valueChanges.subscribe((id) => {
      const i = this.catalogo().find((x) => x.id === Number(id));
      if (i) this.compra.controls.unidad.setValue(unidadGrande(unidadBaseDe(i.unidadSugerida)));
    });
  }

  cargar(): void {
    this.error.set('');
    this.inventario.stock().subscribe({
      next: (s) => this.stock.set(s),
      error: () => { this.stock.set([]); this.error.set('inventario.errors.load'); },
    });
  }

  // ── formato ─────────────────────────────────────────────────────

  cantidad(base: number | null, unidad: UnidadBase): string {
    return formatoCantidad(base, unidad, this.locale());
  }

  pesos(v: number | null | undefined): string {
    if (v == null) return '—';
    return new Intl.NumberFormat(this.locale(), { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);
  }

  /** Costo por litro o por kilo */
  costoGrande(s: StockInsumo): string {
    return s.costoPromedio == null ? '—' : `${this.pesos(s.costoPromedio * 1000)} / ${s.unidadBase === 'ML' ? 'L' : 'kg'}`;
  }

  unidadesDe(base: UnidadBase): MeasurementUnit[] {
    return unidadesDe(base);
  }

  unidadesCompra(): MeasurementUnit[] {
    const i = this.catalogo().find((x) => x.id === Number(this.compra.value.insumoId));
    return i ? unidadesDe(unidadBaseDe(i.unidadSugerida)) : ['LITROS', 'ML', 'KG', 'GRAMOS'];
  }

  // ── historial ───────────────────────────────────────────────────

  alternarHistorial(s: StockInsumo): void {
    if (this.abierto() === s.insumoId) { this.abierto.set(null); return; }
    this.abierto.set(s.insumoId);
    this.movimientos.set([]);
    this.inventario.movimientos(s.insumoId).subscribe({ next: (m) => this.movimientos.set(m) });
  }

  efecto(m: MovimientoInventario): number {
    return m.tipo === 'USO' ? -m.cantidad : m.cantidad;
  }

  async eliminar(m: MovimientoInventario, s: StockInsumo): Promise<void> {
    const mensaje = this.translate.instant('inventario.history.confirmDelete');
    if (!(await this.confirm.preguntar({ mensaje, peligro: true }))) return;
    this.inventario.eliminarMovimiento(m.id).subscribe({
      next: () => { this.cargar(); this.abierto.set(null); this.alternarHistorial(s); },
      error: (e) => this.error.set(e?.error?.message || 'inventario.errors.save'),
    });
  }

  // ── formularios ─────────────────────────────────────────────────

  abrirCompra(s?: StockInsumo): void {
    this.errorForm.set('');
    this.compra.reset({ insumoId: s?.insumoId ?? null, cantidad: null, costoTotal: null, fecha: this.hoy(),
      proveedor: '', observaciones: '', unidad: s ? unidadGrande(s.unidadBase) : 'LITROS' });
    this.panel.set('compra');
  }

  abrirAjuste(s: StockInsumo): void {
    this.errorForm.set('');
    this.sobre.set(s);
    this.ajuste.reset({ cantidadReal: enUnidadGrande(Math.max(s.cantidad, 0)), unidad: unidadGrande(s.unidadBase), observaciones: '' });
    this.panel.set('ajuste');
  }

  abrirMinimo(s: StockInsumo): void {
    this.errorForm.set('');
    this.sobre.set(s);
    this.minimo.reset({ minimo: s.stockMinimo == null ? null : enUnidadGrande(s.stockMinimo), unidad: unidadGrande(s.unidadBase) });
    this.panel.set('minimo');
  }

  cerrar(): void {
    this.panel.set(null);
    this.sobre.set(null);
  }

  guardarCompra(): void {
    if (this.compra.invalid) { this.compra.markAllAsTouched(); return; }
    const v = this.compra.getRawValue();
    this.enviar(this.inventario.registrarCompra({
      insumoId: Number(v.insumoId), cantidad: Number(v.cantidad), unidad: v.unidad!,
      costoTotal: v.costoTotal == null || (v.costoTotal as unknown) === '' ? null : Number(v.costoTotal),
      fecha: v.fecha, proveedor: v.proveedor, observaciones: v.observaciones,
    }));
  }

  guardarAjuste(): void {
    const s = this.sobre();
    if (!s || this.ajuste.invalid) { this.ajuste.markAllAsTouched(); return; }
    const v = this.ajuste.getRawValue();
    this.enviar(this.inventario.ajustar({ insumoId: s.insumoId, cantidadReal: Number(v.cantidadReal), unidad: v.unidad!, observaciones: v.observaciones }));
  }

  guardarMinimo(quitar = false): void {
    const s = this.sobre();
    if (!s || this.minimo.invalid) { this.minimo.markAllAsTouched(); return; }
    const v = this.minimo.getRawValue();
    const valor = quitar || v.minimo == null || (v.minimo as unknown) === '' ? null : Number(v.minimo);
    this.enviar(this.inventario.definirMinimo(s.insumoId, valor, v.unidad!));
  }

  private enviar(op: Observable<unknown>): void {
    this.guardando.set(true);
    this.errorForm.set('');
    op.subscribe({
      next: () => { this.guardando.set(false); this.cerrar(); this.abierto.set(null); this.cargar(); },
      error: (e) => { this.guardando.set(false); this.errorForm.set(e?.error?.message || 'inventario.errors.save'); },
    });
  }

  invalido(form: 'compra' | 'ajuste' | 'minimo', campo: string): boolean {
    const c = (this[form] as unknown as { get(n: string): { invalid: boolean; touched: boolean } | null }).get(campo);
    return !!(c?.invalid && c.touched);
  }

  private hoy(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private locale(): string {
    return this.lang.current() === 'en' ? 'en-US' : 'es-CO';
  }
}
