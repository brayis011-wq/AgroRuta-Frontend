import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import {
  TrabajadorService,
  NominaService,
  PagoService,
  CargoService,
  TrabajadorRequest,
  TrabajadorUpdateRequest,
  NominaRequest
} from '../../../core/services/worker.service';
import { Trabajador, Nomina, Pago, Cargo } from '../../../core/models/worker.model';

type ModoPanel = 'detalle' | 'nuevo' | 'editar' | 'cambiarCargo' | null;

@Component({
  selector: 'app-worker-home',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TranslatePipe],
  templateUrl: './worker-home.html',
  styleUrl: './worker-home.css'
})
export class WorkerHomeComponent implements OnInit {

  trabajadores: Trabajador[] = [];
  cargos:  Cargo[]  = [];
  nominas: Nomina[] = [];
  pagos:   Pago[]   = [];

  busqueda  = '';
  tabActivo = 'trabajadores';
  filtroEstado: 'TODOS' | 'ACTIVO' | 'SUSPENDIDO' = 'ACTIVO';
  cargando  = true;
  guardando = false;
  error     = '';                                   // clave de traducción
  exito     = '';                                   // clave de traducción
  exitoParams: Record<string, unknown> = {};        // parámetros de la clave de éxito

  modoPanel: ModoPanel = null;
  trabajadorSeleccionado: Trabajador | null = null;

  formNuevo!:  FormGroup;
  formEditar!: FormGroup;
  formCargo!:  FormGroup;

  // ✅ NUEVO — formulario generar nómina
  formNomina!:       FormGroup;
  mostrarFormNomina  = false;
  guardandoNomina    = false;
  exitoNomina        = '';   // clave de traducción
  errorNomina        = '';   // clave de traducción (o mensaje crudo del backend)

  tiposContrato = ['FIJO', 'TEMPORAL', 'JORNAL'];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private translate: TranslateService,
    private trabajadorService: TrabajadorService,
    private cargoService: CargoService,
    private nominaService: NominaService,
    private pagoService: PagoService
  ) {}

  ngOnInit(): void {
    this.iniciarForms();
    this.cargarDatos();
  }

  iniciarForms(): void {
    this.formNuevo = this.fb.group({
      nombre:       ['', Validators.required],
      apellido:     ['', Validators.required],
      cedula:       ['', Validators.required],
      telefono:     [''],
      direccion:    [''],
      fechaIngreso: ['', Validators.required],
      tipoContrato: ['FIJO', Validators.required],
      cargoId:      [null, Validators.required]
    });
    this.formEditar = this.fb.group({
      nombre:       ['', Validators.required],
      apellido:     ['', Validators.required],
      telefono:     [''],
      direccion:    [''],
      tipoContrato: ['FIJO', Validators.required]
    });
    this.formCargo = this.fb.group({
      cargoId: [null, Validators.required]
    });
    // ✅ NUEVO
    this.formNomina = this.fb.group({
      periodoInicio: ['', Validators.required],
      periodoFin:    ['', Validators.required]
    });
  }

  cargarDatos(): void {
    this.cargando = true;

    this.trabajadorService.listarTodos().subscribe({
      next: (t) => { this.trabajadores = t; this.cargando = false; this.cdr.detectChanges(); },
      error: () => { this.error = 'workers.home.errors.load'; this.cargando = false; this.cdr.detectChanges(); }
    });

    this.cargoService.listar().subscribe({
      next: (c) => { this.cargos = c; this.cdr.detectChanges(); },
      error: () => {}
    });

    this.nominaService.listarTodas().subscribe({
      next: (n) => { this.nominas = n; this.cdr.detectChanges(); },
      error: () => {}
    });

    this.pagoService.listarTodos().subscribe({
      next: (p) => { this.pagos = p; this.cdr.detectChanges(); },
      error: () => {}
    });
  }

  // ── Getters ──────────────────────────────────────────────────────────────

  get trabajadoresFiltrados(): Trabajador[] {
    let lista = this.trabajadores;
    if (this.filtroEstado !== 'TODOS') {
      lista = lista.filter(t => t.estado === this.filtroEstado);
    }
    const q = this.busqueda.toLowerCase();
    if (!q) return lista;
    return lista.filter(t =>
      t.nombreCompleto?.toLowerCase().includes(q) ||
      t.cedula?.toLowerCase().includes(q) ||
      t.cargo?.nombre?.toLowerCase().includes(q)
    );
  }

  get cantidadActivos():     number { return this.trabajadores.filter(t => t.estado === 'ACTIVO').length; }
  get cantidadSuspendidos(): number { return this.trabajadores.filter(t => t.estado === 'SUSPENDIDO').length; }
  get totalPagado():         number { return this.pagos.reduce((a, p) => a + (p.monto ?? 0), 0); }
  get nominasPendientes():   number { return this.nominas.filter(n => n.estado === 'PENDIENTE').length; }

  // ── Panel ────────────────────────────────────────────────────────────────

  abrirNuevo(): void {
    this.formNuevo.reset({ tipoContrato: 'FIJO', cargoId: null });
    this.trabajadorSeleccionado = null;
    this.modoPanel = 'nuevo';
    this.limpiarMensajes();
  }

  abrirDetalle(t: Trabajador): void {
    this.trabajadorSeleccionado = t;
    this.modoPanel = 'detalle';
    this.mostrarFormNomina = false; // ✅ cerrar form si estaba abierto
    this.limpiarMensajes();
  }

  abrirEditar(t: Trabajador): void {
    this.trabajadorSeleccionado = t;
    this.formEditar.patchValue({
      nombre:       t.nombre,
      apellido:     t.apellido,
      telefono:     t.telefono  ?? '',
      direccion:    t.direccion ?? '',
      tipoContrato: t.tipoContrato ?? 'FIJO'
    });
    this.modoPanel = 'editar';
    this.limpiarMensajes();
  }

  abrirCambiarCargo(t: Trabajador): void {
    this.trabajadorSeleccionado = t;
    this.formCargo.patchValue({ cargoId: t.cargo?.id ?? null });
    this.modoPanel = 'cambiarCargo';
    this.limpiarMensajes();
  }

  cerrarPanel(): void {
    this.modoPanel = null;
    this.trabajadorSeleccionado = null;
    this.mostrarFormNomina = false; // ✅ limpiar form nómina
    this.limpiarMensajes();
  }

  limpiarMensajes(): void {
    this.error = '';
    this.exito = '';
    this.exitoParams = {};
    this.errorNomina = '';
    this.exitoNomina = '';
  }

  // ── Navegación ───────────────────────────────────────────────────────────

  registrarJornal(t: Trabajador): void {
    this.cerrarPanel();
    this.router.navigate(['/worker/jornales/nuevo'], { queryParams: { trabajadorId: t.id } });
  }

  verJornales(t: Trabajador): void {
    this.cerrarPanel();
    this.router.navigate(['/worker/jornales'], { queryParams: { trabajadorId: t.id } });
  }

  verNominas(t: Trabajador): void {
    this.cerrarPanel();
    this.router.navigate(['/worker/nominas'], { queryParams: { trabajadorId: t.id } });
  }

  irA(ruta: string): void { this.router.navigate(['/worker', ruta]); }

  // ── Generar nómina desde el panel ────────────────────────────────────────

  abrirFormNomina(): void {
    this.mostrarFormNomina = true;
    this.formNomina.reset();
    this.exitoNomina = '';
    this.errorNomina = '';
  }

  cerrarFormNomina(): void {
    this.mostrarFormNomina = false;
    this.formNomina.reset();
    this.exitoNomina = '';
    this.errorNomina = '';
  }

  generarNomina(): void {
    if (this.formNomina.invalid || !this.trabajadorSeleccionado?.id) {
      this.formNomina.markAllAsTouched();
      return;
    }
    this.guardandoNomina = true;
    const val = this.formNomina.value;
    const req: NominaRequest = {
      trabajadorId:  this.trabajadorSeleccionado.id,
      periodoInicio: val.periodoInicio,
      periodoFin:    val.periodoFin
    };
    this.nominaService.generar(req).subscribe({
      next: (n: Nomina) => {
        this.nominas = [...this.nominas, n]; // ✅ actualiza el contador de pendientes
        this.guardandoNomina = false;
        this.mostrarFormNomina = false;
        this.formNomina.reset();
        this.exitoNomina = 'workers.home.success.rosterGenerated';
        this.cdr.detectChanges();
        setTimeout(() => { this.exitoNomina = ''; this.cdr.detectChanges(); }, 3500);
      },
      error: (err) => {
        this.guardandoNomina = false;
        this.errorNomina = err?.error?.message ?? 'workers.home.errors.generateRoster';
        this.cdr.detectChanges();
      }
    });
  }

  invalidoNomina(campo: string): boolean {
    const c = this.formNomina.get(campo);
    return !!(c?.invalid && c.touched);
  }

  // ── Mensaje de éxito temporal ────────────────────────────────────────────

  private mostrarExito(clave: string, params: Record<string, unknown> = {}): void {
    this.exito = clave;
    this.exitoParams = params;
    this.cdr.detectChanges();
    setTimeout(() => { this.exito = ''; this.cdr.detectChanges(); }, 3500);
  }

  // ── CRUD ─────────────────────────────────────────────────────────────────

  guardarNuevo(): void {
    if (this.formNuevo.invalid) { this.formNuevo.markAllAsTouched(); return; }
    this.guardando = true;
    const req: TrabajadorRequest = this.formNuevo.value;
    this.trabajadorService.registrar(req).subscribe({
      next: (t) => {
        this.trabajadores = [...this.trabajadores, t];
        this.guardando = false;
        this.modoPanel = null;
        this.mostrarExito('workers.home.success.registered', { name: t.nombreCompleto });
      },
      error: () => { this.error = 'workers.home.errors.register'; this.guardando = false; this.cdr.detectChanges(); }
    });
  }

  guardarEdicion(): void {
    if (this.formEditar.invalid || !this.trabajadorSeleccionado?.id) {
      this.formEditar.markAllAsTouched(); return;
    }
    this.guardando = true;
    const req: TrabajadorUpdateRequest = this.formEditar.value;
    this.trabajadorService.actualizar(this.trabajadorSeleccionado.id, req).subscribe({
      next: (t) => {
        this.trabajadores = this.trabajadores.map(x => x.id === t.id ? t : x);
        this.guardando = false;
        this.modoPanel = null;
        this.mostrarExito('workers.home.success.updated');
      },
      error: () => { this.error = 'workers.home.errors.update'; this.guardando = false; this.cdr.detectChanges(); }
    });
  }

  guardarCargo(): void {
    if (this.formCargo.invalid || !this.trabajadorSeleccionado?.id) return;
    this.guardando = true;
    const cargoId = Number(this.formCargo.value.cargoId);
    this.trabajadorService.cambiarCargo(this.trabajadorSeleccionado.id, cargoId).subscribe({
      next: (t) => {
        this.trabajadores = this.trabajadores.map(x => x.id === t.id ? t : x);
        this.guardando = false;
        this.modoPanel = null;
        this.mostrarExito('workers.home.success.postUpdated');
      },
      error: () => { this.error = 'workers.home.errors.changePost'; this.guardando = false; this.cdr.detectChanges(); }
    });
  }

  desactivar(t: Trabajador): void {
    if (!t.id || !confirm(this.translate.instant('workers.home.confirm.deactivate', { name: t.nombreCompleto }))) return;
    this.trabajadorService.desactivar(t.id).subscribe({
      next: () => {
        this.trabajadores = this.trabajadores.filter(x => x.id !== t.id);
        this.cerrarPanel();
        this.mostrarExito('workers.home.success.deactivated');
      },
      error: () => { this.error = 'workers.home.errors.deactivate'; this.cdr.detectChanges(); }
    });
  }

  suspender(t: Trabajador): void {
    if (!t.id || !confirm(this.translate.instant('workers.home.confirm.suspend', { name: t.nombreCompleto }))) return;
    this.trabajadorService.suspender(t.id).subscribe({
      next: () => {
        this.trabajadores = this.trabajadores.map(x =>
          x.id === t.id ? { ...x, estado: 'SUSPENDIDO' } : x
        );
        this.trabajadorSeleccionado = this.trabajadores.find(x => x.id === t.id) ?? null;
        this.mostrarExito('workers.home.success.suspended');
      },
      error: () => { this.error = 'workers.home.errors.suspend'; this.cdr.detectChanges(); }
    });
  }

  reactivar(t: Trabajador): void {
    if (!t.id || !confirm(this.translate.instant('workers.home.confirm.reactivate', { name: t.nombreCompleto }))) return;
    this.trabajadorService.reactivar(t.id).subscribe({
      next: () => {
        this.trabajadores = this.trabajadores.map(x =>
          x.id === t.id ? { ...x, estado: 'ACTIVO' } : x
        );
        this.trabajadorSeleccionado = this.trabajadores.find(x => x.id === t.id) ?? null;
        this.mostrarExito('workers.home.success.reactivated');
      },
      error: () => { this.error = 'workers.home.errors.reactivate'; this.cdr.detectChanges(); }
    });
  }

  invalido(form: FormGroup, campo: string): boolean {
    const c = form.get(campo);
    return !!(c?.invalid && c.touched);
  }
}
