// src/app/features/worker/labores/lista-labores.ts

import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { LaborService } from '../../../core/services/worker.service';
import { Labor } from '../../../core/models/worker.model';
import { ConfirmService } from '../../../shared/confirm-dialog/confirm.service';

@Component({
  selector: 'app-lista-labores',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe],
  templateUrl: './lista-labores.html',
  styleUrls: ['../../cultivo/cultivo-ui.css', '../../cultivo/cultivo-bloques.css', '../../report/report-tabla.css', '../worker-ui.css', '../worker-panel.css']
})
export class ListaLaboresComponent implements OnInit {
  private readonly confirmService = inject(ConfirmService);
  actividades: Labor[] = [];
  form!: FormGroup;
  modoEdicion: Labor | null = null;
  mostrarForm = false;
  guardando = false;
  error = '';   // clave de traducción

  constructor(
    private fb: FormBuilder,
    private actividadService: LaborService,
    private cdr: ChangeDetectorRef,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.iniciarForm();
    this.cargar();
  }

  iniciarForm(a?: Labor): void {
    this.form = this.fb.group({
      nombre:      [a?.nombre      ?? '', Validators.required],
      descripcion: [a?.descripcion ?? '', Validators.required]
    });
  }

  cargar(): void {
    this.actividadService.listar().subscribe({
      next: (d) => {
        this.actividades = d;
        this.cdr.detectChanges(); // ✅ forzar render
      },
      error: () => {
        this.error = 'workers.activities.errors.load';
        this.cdr.detectChanges();
      }
    });
  }

  abrirNuevo(): void {
    this.modoEdicion = null;
    this.iniciarForm();
    this.mostrarForm = true;
  }

  abrirEditar(a: Labor): void {
    this.modoEdicion = a;
    this.iniciarForm(a);
    this.mostrarForm = true;
  }

  guardar(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.guardando = true;
    const op = (this.modoEdicion?.id != null)
      ? this.actividadService.actualizar(this.modoEdicion.id, this.form.value)
      : this.actividadService.crear(this.form.value);
    op.subscribe({
      next: () => {
        this.mostrarForm = false;
        this.guardando = false;
        this.cargar(); // ya llama detectChanges internamente
      },
      error: () => {
        this.error = 'workers.activities.errors.save';
        this.guardando = false;
        this.cdr.detectChanges();
      }
    });
  }

  async desactivar(a: Labor): Promise<void> {
    if (a.id == null) return;
    const mensaje = this.translate.instant('workers.activities.confirmDeactivate', { name: a.nombre });
    if (!(await this.confirmService.preguntar({ mensaje, peligro: true }))) return;
    this.actividadService.desactivar(a.id).subscribe({
      next: () => this.cargar()
    });
  }

  invalido(n: string): boolean {
    const c = this.form.get(n);
    return !!(c?.invalid && c.touched);
  }
}
