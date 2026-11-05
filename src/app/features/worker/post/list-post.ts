import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { PesosPipe } from '../../../shared/formato.pipe';
import { CargoService } from '../../../core/services/worker.service';
import { Cargo } from '../../../core/models/worker.model';
import { ConfirmService } from '../../../shared/confirm-dialog/confirm.service';

@Component({
  selector: 'app-lista-cargos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe, PesosPipe],
  templateUrl: './list-post.html',
  styleUrls: ['../../cultivo/cultivo-ui.css', '../../cultivo/cultivo-bloques.css', '../../report/report-tabla.css', '../worker-ui.css', '../worker-panel.css']
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
      valorJornal: [cargo?.valorJornal ?? null, [Validators.required, Validators.min(1)]]
    });
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
    const req = this.form.value;
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
