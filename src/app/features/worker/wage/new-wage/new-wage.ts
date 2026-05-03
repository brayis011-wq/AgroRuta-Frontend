import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import {
  JornalService,
  JornalRequest,
  TrabajadorService,
  ActividadService
} from '../../../../core/services/worker.service';
import { Trabajador, Actividad } from '../../../../core/models/worker.model';

@Component({
  selector: 'app-nuevo-jornal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './new-wage.html',
  styleUrls: ['./new-wage.css']
})
export class NuevoJornalComponent implements OnInit {
  form!: FormGroup;
  trabajadores: Trabajador[] = [];
  actividades: Actividad[] = [];
  actividadesSeleccionadas: Set<number> = new Set();
  guardando = false;
  error = '';

  // Guardamos el trabajadorId que vino por queryParam para redirigir de vuelta
  private trabajadorIdOrigen: number | null = null;

  constructor(
    private fb: FormBuilder,
    private jornalService: JornalService,
    private trabajadorService: TrabajadorService,
    private actividadService: ActividadService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // ✅ Fix: fb.group estaba como link markdown corrupto
    this.form = this.fb.group({
      trabajadorId:  [null, Validators.required],
      cultivoId:     [null, Validators.required],
      nombreCultivo: ['',   Validators.required],
      fecha:         ['',   Validators.required],
      observaciones: ['']
    });

    // ✅ Fix: usar listarTodos() igual que en worker-home
    this.trabajadorService.listarTodos().subscribe({
      next: (t: Trabajador[]) => {
        // Solo trabajadores activos pueden tener jornales nuevos
        this.trabajadores = t.filter(w => w.estado === 'ACTIVO');

        const idParam = this.route.snapshot.queryParamMap.get('trabajadorId');
        if (idParam) {
          this.trabajadorIdOrigen = Number(idParam);
          this.form.patchValue({ trabajadorId: this.trabajadorIdOrigen });
        }
      },
      error: () => { this.error = 'Error al cargar trabajadores'; }
    });

    this.actividadService.listar().subscribe({
      next: (a: Actividad[]) => this.actividades = a,
      error: () => { this.error = 'Error al cargar actividades'; }
    });
  }

  toggleActividad(id: number | undefined): void {
    if (id == null) return;
    this.actividadesSeleccionadas.has(id)
      ? this.actividadesSeleccionadas.delete(id)
      : this.actividadesSeleccionadas.add(id);
  }

  estaSeleccionada(id: number | undefined): boolean {
    return id != null && this.actividadesSeleccionadas.has(id);
  }

  guardar(): void {
    if (this.form.invalid || this.actividadesSeleccionadas.size === 0) {
      this.form.markAllAsTouched();
      if (this.actividadesSeleccionadas.size === 0) {
        this.error = 'Selecciona al menos una actividad';
      }
      return;
    }

    this.guardando = true;
    this.error = '';

    const v = this.form.value;
    const req: JornalRequest = {
      trabajadorId:  Number(v.trabajadorId),
      cultivoId:     Number(v.cultivoId),
      nombreCultivo: v.nombreCultivo,
      fecha:         v.fecha,
      actividadIds:  [...this.actividadesSeleccionadas],
      observaciones: v.observaciones || undefined
    };

    this.jornalService.registrar(req).subscribe({
      next: () => {
        // ✅ Fix: redirigir a la lista de jornales del trabajador
        // Si vino desde un trabajador específico, mostrar sus jornales
        // Si no, ir al home de trabajadores
        if (this.trabajadorIdOrigen) {
          this.router.navigate(['/worker/jornales'], {
            queryParams: { trabajadorId: this.trabajadorIdOrigen }
          });
        } else {
          this.router.navigate(['/worker']);
        }
      },
      error: () => {
        this.error = 'Error al registrar jornal';
        this.guardando = false;
      }
    });
  }

  invalido(n: string): boolean {
    const c = this.form.get(n);
    return !!(c?.invalid && c.touched);
  }
}
