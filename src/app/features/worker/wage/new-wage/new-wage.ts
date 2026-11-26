import { UltimoUsadoService } from '../../../../core/services/last-used.service';

import { SiguienteCampoDirective } from '../../../../shared/next-field.directive';
import { ChangeDetectorRef, Component, OnInit, inject, HostListener } from '@angular/core';
import { AvisosService } from '../../../../core/services/toast.service';
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
  LaborService,
} from '../../../../core/services/worker.service';
import { Trabajador, Labor } from '../../../../core/models/worker.model';

/** Lo que se recuerda del último jornal registrado */
interface UltimoJornal {
  fincaId?: number;
  cultivoId?: number;
  actividadIds?: number[];
}

@Component({
  selector: 'app-nuevo-jornal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    TranslatePipe,
    PesosPipe,
    SiguienteCampoDirective,
  ],
  templateUrl: './new-wage.html',
  styleUrls: [
    '../../../crop/crop-ui.css',
    '../../../crop/crop-blocks.css',
    '../../worker-ui.css',
    '../../worker-panel.css',
    '../../../../shared/styles/opciones.css',
    './new-wage.css',
  ],
})
export class NuevoJornalComponent implements OnInit {
  private readonly avisos = inject(AvisosService);
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
  error = ''; // clave de traducción

  // Guardamos el trabajadorId que vino por queryParam para redirigir de vuelta
  private trabajadorIdOrigen: number | null = null;

  constructor(
    private fb: FormBuilder,
    private jornalService: JornalService,
    private trabajadorService: TrabajadorService,
    private actividadService: LaborService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  private readonly ultimo = inject(UltimoUsadoService);

  // ── Cambios sin guardar: cuenta solo lo que escribe o elige la persona (no lo que la app rellena sola) ──
  private tocado = false;
  private guardado = false;

  @HostListener('input')
  @HostListener('change')
  alEditar(): void {
    this.tocado = true;
  }

  tieneCambios(): boolean {
    return this.tocado && !this.guardado;
  }

  ngOnInit(): void {
    // ✅ Fix: fb.group estaba como link markdown corrupto
    this.form = this.fb.group({
      trabajadorId: [null, Validators.required],
      fincaId: [null, Validators.required],
      cultivoId: [{ value: null, disabled: true }, Validators.required],
      fecha: [this.hoy, Validators.required],
      kilos: [null],
      observaciones: [''],
    });
    // Si el cargo se paga por kilo, los kilos son obligatorios
    this.form.get('trabajadorId')!.valueChanges.subscribe(() => this.ajustarKilos());

    // ✅ Fix: usar listarTodos() igual que en worker-home
    this.trabajadorService.listarTodos().subscribe({
      next: (t: Trabajador[]) => {
        // Solo trabajadores activos pueden tener jornales nuevos
        this.trabajadores = t.filter((w) => w.estado === 'ACTIVO');

        const idParam = this.route.snapshot.queryParamMap.get('trabajadorId');
        if (idParam) {
          this.trabajadorIdOrigen = Number(idParam);
          this.form.patchValue({ trabajadorId: this.trabajadorIdOrigen });
          this.ajustarKilos();
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.error = 'workers.wages.new.errors.loadWorkers';
        this.cdr.markForCheck();
      },
    });

    // Al cambiar de finca se reinicia el cultivo elegido
    this.form.get('fincaId')!.valueChanges.subscribe((id) => this.alCambiarFinca(id));

    this.jornalService.cultivosDisponibles().subscribe({
      next: (c: CultivoDisponible[]) => {
        this.cultivos = c;
        const porId = new Map<number, string>();
        c.forEach((x) => porId.set(x.fincaId, x.fincaNombre));
        this.fincas = [...porId]
          .map(([id, nombre]) => ({ id, nombre }))
          .sort((a, b) => a.nombre.localeCompare(b.nombre));
        this.cargandoCultivos = false;
        // Con una sola finca no hay nada que elegir; si no, la finca y el cultivo del último jornal
        const ultimo = this.ultimo.leer<UltimoJornal>('jornal');
        if (this.fincas.length === 1) this.elegirFinca(this.fincas[0].id);
        else if (ultimo?.fincaId && this.fincas.some((x) => x.id === ultimo.fincaId))
          this.elegirFinca(ultimo.fincaId);
        if (ultimo?.cultivoId && this.cultivosDeFinca.some((x) => x.id === ultimo.cultivoId))
          this.form.patchValue({ cultivoId: ultimo.cultivoId });
        this.cdr.markForCheck();
      },
      error: () => {
        this.cargandoCultivos = false;
        this.error = 'workers.wages.new.errors.loadCrops';
        this.cdr.markForCheck();
      },
    });

    this.actividadService.listar().subscribe({
      next: (a: Labor[]) => {
        this.actividades = a;
        // Las labores del último jornal (en temporada se repite el mismo trabajo varios días)
        const ids = this.ultimo.leer<UltimoJornal>('jornal')?.actividadIds ?? [];
        ids
          .filter((id) => a.some((x) => x.id === id))
          .forEach((id) => this.actividadesSeleccionadas.add(id));
        this.cdr.markForCheck();
      },
      error: () => {
        this.error = 'workers.wages.new.errors.loadActivities';
        this.cdr.markForCheck();
      },
    });
  }

  /** Cultivos de la finca elegida */
  /** Trabajador elegido en el formulario, para mostrar su cargo y el valor del jornal */
  get trabajadorElegido(): Trabajador | null {
    const id = this.form?.get('trabajadorId')?.value;
    return this.trabajadores.find((t) => t.id === id) ?? null;
  }

  /** El cargo del trabajador elegido se paga por kilo */
  get porKilo(): boolean {
    return this.trabajadorElegido?.cargo?.modalidadPago === 'KILO';
  }

  /** Lo que valdrá el jornal: el valor del día, o kilos × valor del kilo */
  get valorEstimado(): number {
    const c = this.trabajadorElegido?.cargo;
    if (!c) return 0;
    if (c.modalidadPago !== 'KILO') return c.valorJornal;
    return Math.round((Number(this.form.get('kilos')?.value) || 0) * (c.valorKilo ?? 0));
  }

  private ajustarKilos(): void {
    const kilos = this.form.get('kilos')!;
    kilos.setValidators(this.porKilo ? [Validators.required, Validators.min(0.1)] : []);
    if (!this.porKilo) kilos.setValue(null, { emitEvent: false });
    kilos.updateValueAndValidity({ emitEvent: false });
  }

  get cultivosDeFinca(): CultivoDisponible[] {
    const fincaId = this.form?.get('fincaId')?.value;
    return this.cultivos.filter((c) => c.fincaId === fincaId);
  }

  elegirFinca(id: number): void {
    this.form.patchValue({ fincaId: id });
  }

  private alCambiarFinca(id: number | null): void {
    const cultivo = this.form.get('cultivoId')!;
    cultivo.reset(null);
    if (id == null) {
      cultivo.disable();
      return;
    }
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
      trabajadorId: Number(v.trabajadorId),
      cultivoId: Number(v.cultivoId),
      fecha: v.fecha,
      actividadIds: [...this.actividadesSeleccionadas],
      kilos: this.porKilo ? Number(v.kilos) : null,
      observaciones: v.observaciones || undefined,
    };

    this.jornalService.registrar(req).subscribe({
      next: () => {
        this.guardado = true;
        this.ultimo.guardar<UltimoJornal>('jornal', {
          fincaId: v.fincaId,
          cultivoId: req.cultivoId,
          actividadIds: req.actividadIds,
        });
        // ✅ Fix: redirigir a la lista de jornales del trabajador
        // Si vino desde un trabajador específico, mostrar sus jornales
        // Si no, ir al home de trabajadores
        this.avisos.exito('avisos.wage');
        if (this.trabajadorIdOrigen) {
          this.router.navigate(['/worker/workdays'], {
            queryParams: { trabajadorId: this.trabajadorIdOrigen },
          });
        } else {
          this.router.navigate(['/worker']);
        }
      },
      error: (err) => {
        // El backend explica el motivo (cultivo finalizado, de otra finca, etc.)
        this.error = err?.error?.message || 'workers.wages.new.errors.register';
        this.guardando = false;
      },
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
