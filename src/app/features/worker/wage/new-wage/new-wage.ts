import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { PesosPipe } from '../../../../shared/format.pipe';
import {
  JornalService,
  JornalRequest,
  CultivoDisponible,
  TrabajadorService,
  LaborService
} from '../../../../core/services/worker.service';
import { Trabajador, Labor } from '../../../../core/models/worker.model';

@Component({
  selector: 'app-nuevo-jornal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, TranslatePipe, PesosPipe],
  templateUrl: './new-wage.html',
  styleUrls: ['../../../crop/crop-ui.css', '../../../crop/crop-blocks.css', '../../worker-ui.css', '../../worker-panel.css', './new-wage.css']
})
export class NuevoJornalComponent implements OnInit {
  form!: FormGroup;
  trabajadores: Trabajador[] = [];
  actividades: Labor[] = [];
  actividadesSeleccionadas: Set<number> = new Set();

  /** Cultivos activos del agricultor y las fincas donde están */
  cultivos: CultivoDisponible[] = [];
  fincas: { id: number; nombre: string }[] = [];
  cargandoCultivos = true;
  /** Fecha de hoy (YYYY-MM-DD, hora local): no se registran jornales a futuro */
  readonly hoy = fechaLocal(new Date());
  private readonly cdr = inject(ChangeDetectorRef);
  guardando = false;
  error = '';   // clave de traducción

  // Guardamos el trabajadorId que vino por queryParam para redirigir de vuelta
  private trabajadorIdOrigen: number | null = null;

  constructor(
    private fb: FormBuilder,
    private jornalService: JornalService,
    private trabajadorService: TrabajadorService,
    private actividadService: LaborService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // ✅ Fix: fb.group estaba como link markdown corrupto
    this.form = this.fb.group({
      trabajadorId:  [null, Validators.required],
      fincaId:       [null, Validators.required],
      cultivoId:     [{ value: null, disabled: true }, Validators.required],
      fecha:         [this.hoy, Validators.required],
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
        this.cdr.markForCheck();
      },
      error: () => { this.error = 'workers.wages.new.errors.loadWorkers'; this.cdr.markForCheck(); }
    });

    // Al cambiar de finca se reinicia el cultivo elegido
    this.form.get('fincaId')!.valueChanges.subscribe((id) => this.alCambiarFinca(id));

    this.jornalService.cultivosDisponibles().subscribe({
      next: (c: CultivoDisponible[]) => {
        this.cultivos = c;
        const porId = new Map<number, string>();
        c.forEach(x => porId.set(x.fincaId, x.fincaNombre));
        this.fincas = [...porId].map(([id, nombre]) => ({ id, nombre }))
          .sort((a, b) => a.nombre.localeCompare(b.nombre));
        this.cargandoCultivos = false;
        // Con una sola finca no hay nada que elegir
        if (this.fincas.length === 1) this.elegirFinca(this.fincas[0].id);
        this.cdr.markForCheck();
      },
      error: () => {
        this.cargandoCultivos = false;
        this.error = 'workers.wages.new.errors.loadCrops';
        this.cdr.markForCheck();
      }
    });

    this.actividadService.listar().subscribe({
      next: (a: Labor[]) => { this.actividades = a; this.cdr.markForCheck(); },
      error: () => { this.error = 'workers.wages.new.errors.loadActivities'; this.cdr.markForCheck(); }
    });
  }

  /** Cultivos de la finca elegida */
  /** Trabajador elegido en el formulario, para mostrar su cargo y el valor del jornal */
  get trabajadorElegido(): Trabajador | null {
    const id = this.form?.get('trabajadorId')?.value;
    return this.trabajadores.find(t => t.id === id) ?? null;
  }

  get cultivosDeFinca(): CultivoDisponible[] {
    const fincaId = this.form?.get('fincaId')?.value;
    return this.cultivos.filter(c => c.fincaId === fincaId);
  }

  elegirFinca(id: number): void {
    this.form.patchValue({ fincaId: id });
  }

  private alCambiarFinca(id: number | null): void {
    const cultivo = this.form.get('cultivoId')!;
    cultivo.reset(null);
    if (id == null) { cultivo.disable(); return; }
    cultivo.enable();
    const deLaFinca = this.cultivosDeFinca;
    if (deLaFinca.length === 1) cultivo.setValue(deLaFinca[0].id);
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
        this.error = 'workers.wages.new.errors.noActivity';
      }
      return;
    }

    this.guardando = true;
    this.error = '';

    const v = this.form.getRawValue();
    const req: JornalRequest = {
      trabajadorId:  Number(v.trabajadorId),
      cultivoId:     Number(v.cultivoId),
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
          this.router.navigate(['/worker/workdays'], {
            queryParams: { trabajadorId: this.trabajadorIdOrigen }
          });
        } else {
          this.router.navigate(['/worker']);
        }
      },
      error: (err) => {
        // El backend explica el motivo (cultivo finalizado, de otra finca, etc.)
        this.error = err?.error?.message || 'workers.wages.new.errors.register';
        this.guardando = false;
      }
    });
  }

  invalido(n: string): boolean {
    const c = this.form.get(n);
    return !!(c?.invalid && c.touched);
  }
}

function fechaLocal(d: Date): string {
  const dos = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
}
