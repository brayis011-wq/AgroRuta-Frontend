import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AgriculturalInputService } from '../../../core/services/AgriculturalInput.service';
import { LanguageService } from '../../../core/services/language.service';
import {
  AgriculturalInput,
  AgriculturalInputRequest,
  AgriculturalInputType,
  MeasurementUnit,
} from '../../../core/models/AgriculturalInput.model';
import { formatoNumero } from '../formato';

@Component({
  selector: 'app-admin-insumos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe],
  templateUrl: './admin-insumos.html',
  styleUrls: ['../admin-page.css', './admin-insumos.css'],
})
export class AdminInsumosComponent implements OnInit {
  private readonly insumoService = inject(AgriculturalInputService);
  private readonly lang = inject(LanguageService);
  private readonly translate = inject(TranslateService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly fb = inject(FormBuilder);

  /** Tipos y unidades que acepta el backend (AgriculturalInputRequest). */
  readonly tipos: AgriculturalInputType[] = ['FUNGICIDA', 'INSECTICIDA', 'HERBICIDA', 'FERTILIZANTE_FOLIAR'];
  readonly unidades: MeasurementUnit[] = ['LITROS', 'ML', 'GRAMOS', 'KG'];

  insumos: AgriculturalInput[] = [];
  cargando = true;
  error = false;
  busqueda = '';

  formularioAbierto = false;
  editando: AgriculturalInput | null = null;
  guardando = false;
  porEliminar: AgriculturalInput | null = null;
  mensaje: { tipo: 'ok' | 'error'; texto: string } | null = null;

  readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(150)]],
    tipo: ['FUNGICIDA' as AgriculturalInputType, Validators.required],
    unidadSugerida: ['LITROS' as MeasurementUnit, Validators.required],
    dosisSugerida: [1, [Validators.required, Validators.min(0.01)]],
    reentradaHoras: [24, [Validators.required, Validators.min(0)]],
  });

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    this.error = false;
    this.insumoService.getAll().subscribe({
      next: (lista) => {
        this.insumos = lista;
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = true;
        this.cargando = false;
        this.cdr.detectChanges();
      },
    });
  }

  get visibles(): AgriculturalInput[] {
    const q = this.busqueda.trim().toLowerCase();
    return this.insumos
      .filter((i) => !q || i.nombre.toLowerCase().includes(q))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  nuevo(): void {
    this.editando = null;
    this.form.reset();
    this.formularioAbierto = true;
    this.mensaje = null;
  }

  editar(insumo: AgriculturalInput): void {
    this.editando = insumo;
    this.form.reset({
      nombre: insumo.nombre,
      tipo: insumo.tipo,
      unidadSugerida: insumo.unidadSugerida,
      dosisSugerida: insumo.dosisSugerida,
      reentradaHoras: insumo.reentradaHoras,
    });
    this.formularioAbierto = true;
    this.mensaje = null;
  }

  cerrarFormulario(): void {
    if (!this.guardando) this.formularioAbierto = false;
  }

  invalido(campo: keyof typeof this.form.controls): boolean {
    const c = this.form.controls[campo];
    return c.invalid && c.touched;
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const req: AgriculturalInputRequest = { ...v, nombre: v.nombre.trim() };
    const peticion = this.editando
      ? this.insumoService.update(this.editando.id, req)
      : this.insumoService.create(req);

    this.guardando = true;
    peticion.subscribe({
      next: (guardado) => {
        const existe = this.insumos.some((i) => i.id === guardado.id);
        this.insumos = existe
          ? this.insumos.map((i) => (i.id === guardado.id ? guardado : i))
          : [...this.insumos, guardado];
        this.guardando = false;
        this.formularioAbierto = false;
        this.mensaje = {
          tipo: 'ok',
          texto: this.translate.instant(existe ? 'admin.inputs.updated' : 'admin.inputs.created', { name: guardado.nombre }),
        };
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.guardando = false;
        this.mensaje = { tipo: 'error', texto: err?.error?.message || this.translate.instant('admin.inputs.saveError') };
        this.cdr.detectChanges();
      },
    });
  }

  pedirEliminar(insumo: AgriculturalInput): void {
    this.porEliminar = insumo;
  }

  confirmarEliminar(): void {
    const insumo = this.porEliminar;
    if (!insumo) return;
    this.guardando = true;
    this.insumoService.delete(insumo.id).subscribe({
      next: () => {
        this.insumos = this.insumos.filter((i) => i.id !== insumo.id);
        this.guardando = false;
        this.porEliminar = null;
        this.mensaje = { tipo: 'ok', texto: this.translate.instant('admin.inputs.deleted', { name: insumo.nombre }) };
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.guardando = false;
        this.porEliminar = null;
        this.mensaje = { tipo: 'error', texto: err?.error?.message || this.translate.instant('admin.inputs.deleteError') };
        this.cdr.detectChanges();
      },
    });
  }

  num(valor: number, decimales = 0): string {
    return formatoNumero(valor, this.lang.current(), decimales);
  }
}
