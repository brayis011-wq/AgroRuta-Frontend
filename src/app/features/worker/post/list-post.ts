import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { CargoService } from '../../../core/services/worker.service';
import { Cargo } from '../../../core/models/worker.model';

@Component({
  selector: 'app-lista-cargos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe],
  templateUrl: './list-post.html',
  styleUrls: ['./list-post.css']
})
export class ListaCargosComponent implements OnInit {
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

  desactivar(c: Cargo): void {
    if (c.id == null) return;
    const msg = this.translate.instant('workers.posts.confirmDeactivate', { name: c.nombre });
    if (!confirm(msg)) return;
    this.cargoService.desactivar(c.id).subscribe({ next: () => this.cargar() });
  }

  invalido(nombre: string): boolean {
    const ctrl = this.form.get(nombre);
    return !!(ctrl?.invalid && ctrl.touched);
  }
}
