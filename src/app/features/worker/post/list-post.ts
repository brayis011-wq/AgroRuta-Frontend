import { PestanasCatalogoComponent } from '../catalog-tabs/catalog-tabs';
import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { PesosPipe } from '../../../shared/format.pipe';
import { CargoService } from '../../../core/services/worker.service';
import { Cargo } from '../../../core/models/worker.model';
import { ConfirmService } from '../../../shared/confirm-dialog/confirm.service';

@Component({
  selector: 'app-lista-cargos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe, PesosPipe, PestanasCatalogoComponent],
  templateUrl: './list-post.html',
  styleUrls: ['../../crop/crop-ui.css', '../../crop/crop-blocks.css', '../../report/report-table.css', '../worker-ui.css', '../worker-panel.css', '../../../shared/styles/opciones.css']
})
export class ListaCargosComponent implements OnInit {
  private readonly confirmService = inject(ConfirmService);
  cargos: Cargo[] = [];
  form!: FormGroup;
  modoEdicion: Cargo | null = null;
  mostrarForm = false;
  guardando = false;
  error = '';   // clave de traducción

  constructor(
    private fb: FormBuilder,
    private cargoService: CargoService,
    private cdr: ChangeDetectorRef,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.iniciarForm();
    this.cargar();
  }

  iniciarForm(cargo?: Cargo): void {
    this.form = this.fb.group({
      nombre:      [cargo?.nombre ?? '',        Validators.required],
      descripcion: [cargo?.descripcion ?? '',   Validators.required],
      modalidadPago: [cargo?.modalidadPago ?? 'JORNAL'],
      valorJornal: [cargo?.modalidadPago === 'KILO' ? null : (cargo?.valorJornal ?? null)],
      valorKilo:   [cargo?.valorKilo ?? null]
    });
    this.ajustarValidadores();
    this.form.get('modalidadPago')!.valueChanges.subscribe(() => this.ajustarValidadores());
  }

  /** Por día pide el valor del jornal; por kilo, el valor del kilo */
  private ajustarValidadores(): void {
    const porKilo = this.form.get('modalidadPago')!.value === 'KILO';
    const jornal = this.form.get('valorJornal')!;
    const kilo = this.form.get('valorKilo')!;
    jornal.setValidators(porKilo ? [] : [Validators.required, Validators.min(1)]);
    kilo.setValidators(porKilo ? [Validators.required, Validators.min(1)] : []);
    jornal.updateValueAndValidity({ emitEvent: false });
    kilo.updateValueAndValidity({ emitEvent: false });
  }

  get porKilo(): boolean {
    return this.form?.get('modalidadPago')?.value === 'KILO';
  }

  cargar(): void {
    this.cargoService.listar().subscribe({
      next: (d) => {
        this.cargos = [...d];        // spread para forzar nueva referencia
        this.cdr.detectChanges();    // fuerza detección de cambios
      },
      error: (e) => {
        console.error('Error cargos:', e);
        this.error = 'workers.posts.errors.load';
        this.cdr.detectChanges();
      }
    });
  }

  abrirNuevo(): void {
    this.modoEdicion = null;
    this.iniciarForm();
    this.mostrarForm = true;
  }

  abrirEditar(c: Cargo): void {
    this.modoEdicion = c;
    this.iniciarForm(c);
    this.mostrarForm = true;
  }

  guardar(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.guardando = true;
    const v = this.form.value;
    const porKilo = v.modalidadPago === 'KILO';
    const req = { nombre: v.nombre, descripcion: v.descripcion, modalidadPago: v.modalidadPago,
      valorJornal: porKilo ? null : v.valorJornal, valorKilo: porKilo ? v.valorKilo : null };
    const op = (this.modoEdicion?.id != null)
      ? this.cargoService.actualizar(this.modoEdicion.id, req)
      : this.cargoService.crear(req);

    op.subscribe({
      next: () => { this.cargar(); this.mostrarForm = false; this.guardando = false; },
      error: () => {
        this.error = 'workers.posts.errors.save';
        this.guardando = false;
        this.cdr.detectChanges();
      }
    });
  }

  async desactivar(c: Cargo): Promise<void> {
    if (c.id == null) return;
    const mensaje = this.translate.instant('workers.posts.confirmDeactivate', { name: c.nombre });
    if (!(await this.confirmService.preguntar({ mensaje, peligro: true }))) return;
    this.cargoService.desactivar(c.id).subscribe({ next: () => this.cargar() });
  }

  invalido(nombre: string): boolean {
    const ctrl = this.form.get(nombre);
    return !!(ctrl?.invalid && ctrl.touched);
  }
}
