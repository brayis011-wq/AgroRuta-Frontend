// src/app/features/worker/activities/list-activities.ts

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActividadService } from '../../../core/services/worker.service';
import { Actividad } from '../../../core/models/worker.model';

@Component({
  selector: 'app-lista-actividades',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './list-activities.html',
  styleUrls: ['./list-activities.css']
})
export class ListaActividadesComponent implements OnInit {
  actividades: Actividad[] = [];
  form!: FormGroup;
  modoEdicion: Actividad | null = null;
  mostrarForm = false;
  guardando = false;
  error = '';

  constructor(
    private fb: FormBuilder,
    private actividadService: ActividadService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.iniciarForm();
    this.cargar();
  }

  iniciarForm(a?: Actividad): void {
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
        this.error = 'Error al cargar actividades';
        this.cdr.detectChanges();
      }
    });
  }

  abrirNuevo(): void {
    this.modoEdicion = null;
    this.iniciarForm();
    this.mostrarForm = true;
  }

  abrirEditar(a: Actividad): void {
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
        this.error = 'Error al guardar';
        this.guardando = false;
        this.cdr.detectChanges();
      }
    });
  }

  desactivar(a: Actividad): void {
    if (a.id == null) return;
    if (!confirm(`¿Desactivar la actividad "${a.nombre}"?`)) return;
    this.actividadService.desactivar(a.id).subscribe({
      next: () => this.cargar()
    });
  }

  invalido(n: string): boolean {
    const c = this.form.get(n);
    return !!(c?.invalid && c.touched);
  }
}
