import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { PesosPipe, FechaPipe, PeriodoPipe } from '../../../../shared/format.pipe';
import { JornalService, TrabajadorService, NominaService, NominaRequest } from '../../../../core/services/worker.service';
import { Jornal, Trabajador, Nomina, ResumenJornales } from '../../../../core/models/worker.model';

@Component({
  selector: 'app-lista-jornales',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule, TranslatePipe, PesosPipe, FechaPipe, PeriodoPipe],
  templateUrl: './list-wage.html',
  styleUrls: ['../../../crop/crop-ui.css', '../../../crop/crop-blocks.css', '../../../report/report-table.css', '../../worker-ui.css', '../../worker-panel.css', './list-wage.css']
})
export class ListaJornalesComponent implements OnInit {

  /** Jornales cargados hasta ahora, más recientes primero (se suman páginas con "Cargar más") */
  jornales:   Jornal[]      = [];
  /** Jornales en total del trabajador en el rango, en todas las páginas */
  total = 0;
  private pagina = 0;
  cargandoMas = false;
  /** Totales calculados en el servidor para el trabajador y el rango (no dependen de las páginas cargadas) */
  resumen: ResumenJornales | null = null;
  trabajador: Trabajador | null = null;
  /** Trabajadores del agricultor, para elegir de quién ver los jornales */
  trabajadores: Trabajador[] = [];
  cargandoTrabajadores = true;
  nominaGenerada: Nomina | null = null;

  trabajadorId: number | null = null;
  busqueda    = '';
  fechaInicio = '';
  fechaFin    = '';
  cargando    = false;
  error       = '';   // clave de traducción
  exito       = '';

  panelNomina  = false;
  generando    = false;
  formNomina!: FormGroup;

  constructor(
    private jornalService:    JornalService,
    private trabajadorService: TrabajadorService,
    private nominaService:    NominaService,
    private route:  ActivatedRoute,
    private router: Router,
    private fb:     FormBuilder,
    private cdr:    ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.formNomina = this.fb.group({
      periodoInicio: ['', Validators.required],
      periodoFin:    ['', Validators.required]
    });

    this.trabajadorService.listarTodos().subscribe({
      next: (t) => {
        this.trabajadores = [...t].sort((a, b) => (a.nombreCompleto ?? '').localeCompare(b.nombreCompleto ?? ''));
        this.cargandoTrabajadores = false;
        this.abrirPrimeroSiNoHay();
        this.cdr.detectChanges();
      },
      error: () => { this.cargandoTrabajadores = false; this.cdr.detectChanges(); }
    });

    this.route.queryParams.subscribe(params => {
      const idParam = params['trabajadorId'];
      if (idParam) {
        this.trabajadorId = Number(idParam);
        this.cargarTrabajador();
        this.cargarJornales();
      } else {
        this.trabajadorId = null;
        this.trabajador = null;
        this.jornales = [];
        this.total = 0;
        this.resumen = null;
        this.abrirPrimeroSiNoHay();
      }
      this.cdr.detectChanges();
    });
  }

  cargarTrabajador(): void {
    if (!this.trabajadorId) return;
    this.trabajadorService.buscarPorId(this.trabajadorId).subscribe({
      next:  (t) => { this.trabajador = t; this.cdr.detectChanges(); },
      error: () => {}
    });
  }

  /** Primera página y totales del trabajador en el rango de fechas */
  cargarJornales(): void {
    if (!this.trabajadorId) return;
    this.error = '';
    this.resumen = null;
    this.cargarPagina(0);
    const id = this.trabajadorId;
    this.jornalService.resumenPorTrabajador(id, this.fechaInicio || undefined, this.fechaFin || undefined).subscribe({
      next: (r) => {
        if (id === this.trabajadorId) { this.resumen = r; this.cdr.detectChanges(); }
      },
      error: () => {}
    });
  }

  cargarMas(): void {
    if (!this.hayMas || this.cargandoMas) return;
    this.cargarPagina(this.pagina + 1);
  }

  get hayMas(): boolean { return this.jornales.length < this.total; }

  private cargarPagina(pagina: number): void {
    if (!this.trabajadorId) return;
    if (pagina === 0) this.cargando = true; else this.cargandoMas = true;
    this.cdr.detectChanges();
    const id = this.trabajadorId;

    this.jornalService.paginaPorTrabajador(
      id,
      pagina,
      this.fechaInicio || undefined,
      this.fechaFin    || undefined
    ).subscribe({
      next: (p) => {
        if (id !== this.trabajadorId) return;   // cambió de trabajador mientras cargaba
        this.jornales = pagina === 0 ? p.contenido : [...this.jornales, ...p.contenido];
        this.total = p.total;
        this.pagina = pagina;
        this.cargando = false;
        this.cargandoMas = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error       = 'workers.wages.list.errors.load';
        this.cargando    = false;
        this.cargandoMas = false;
        this.cdr.detectChanges();
      }
    });
  }

  /** Sin trabajador en la URL se abre el primero, para no mostrar una página vacía */
  private abrirPrimeroSiNoHay(): void {
    if (this.trabajadorId == null && this.trabajadores.length > 0) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { trabajadorId: this.trabajadores[0].id },
        replaceUrl: true,
      });
    }
  }

  /** Trabajador elegido: se toma de la lista ya cargada y, si no está, del detalle pedido aparte */
  get seleccionado(): Trabajador | null {
    return this.trabajadores.find(t => t.id === this.trabajadorId) ?? this.trabajador;
  }

  iniciales(t: Trabajador): string {
    return ((t.nombre?.[0] ?? '') + (t.apellido?.[0] ?? '')).toUpperCase() || '?';
  }

  /** Cambia de trabajador sin salir de la página (queda en la URL) */
  elegirTrabajador(id: number | null): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { trabajadorId: id ?? null },
    });
  }

  filtrarFechas(): void { this.cargarJornales(); }

  limpiarFiltros(): void {
    this.fechaInicio = '';
    this.fechaFin    = '';
    this.cargarJornales();
  }

  get filtrados(): Jornal[] {
    const q = this.busqueda.toLowerCase();
    if (!q) return this.jornales;
    return this.jornales.filter(j =>
      j.trabajador?.nombreCompleto?.toLowerCase().includes(q) ||
      j.nombreCultivo?.toLowerCase().includes(q)
    );
  }

  /**
   * Los totales salen del resumen del servidor (todos los jornales del rango, no solo los cargados).
   * Con una búsqueda escrita se calculan sobre los jornales que coinciden entre los ya cargados.
   */
  private get conBusqueda(): boolean { return !!this.busqueda.trim(); }

  get cantidadJornales(): number {
    if (!this.conBusqueda && this.resumen) return this.resumen.cantidad;
    return this.filtrados.length;
  }

  get totalJornales(): number {
    if (!this.conBusqueda && this.resumen) return this.resumen.valorTotal;
    return this.filtrados.reduce((a, j) => a + (j.valorJornal ?? 0), 0);
  }

  get pendientes(): number {
    if (!this.conBusqueda && this.resumen) return this.resumen.pendientes;
    return this.filtrados.filter(j => !j.liquidado).length;
  }

  get totalPendiente(): number {
    if (!this.conBusqueda && this.resumen) return this.resumen.valorPendiente;
    return this.filtrados
      .filter(j => !j.liquidado)
      .reduce((a, j) => a + (j.valorJornal ?? 0), 0);
  }

  abrirGenerarNomina(): void {
    // El periodo propuesto va del jornal sin liquidar más antiguo al más reciente (de todo el rango)
    const desde = this.resumen?.primeraPendiente ?? this.fechaPendiente(Math.min);
    const hasta = this.resumen?.ultimaPendiente ?? this.fechaPendiente(Math.max);
    if (desde && hasta) {
      this.formNomina.patchValue({ periodoInicio: desde, periodoFin: hasta });
    } else {
      this.formNomina.reset();
    }
    this.nominaGenerada = null;
    this.error  = '';
    this.panelNomina = true;
    this.cdr.detectChanges();
  }

  /** Fecha (yyyy-mm-dd) del jornal pendiente más antiguo o más reciente entre los cargados, si no hay resumen */
  private fechaPendiente(elegir: (...n: number[]) => number): string | null {
    const fechas = this.jornales
      .filter(j => !j.liquidado && j.fecha)
      .map(j => new Date(j.fecha!).getTime());
    return fechas.length ? new Date(elegir(...fechas)).toISOString().split('T')[0] : null;
  }

  cerrarPanel(): void {
    this.panelNomina    = false;
    this.nominaGenerada = null;
    this.error  = '';
    this.exito  = '';
    this.cdr.detectChanges();
  }

  generarNomina(): void {
    if (this.formNomina.invalid || !this.trabajadorId) {
      this.formNomina.markAllAsTouched();
      return;
    }

    const { periodoInicio, periodoFin } = this.formNomina.value;
    if (periodoFin < periodoInicio) {
      this.error = 'workers.wages.list.errors.endBeforeStart';
      return;
    }

    this.generando = true;
    this.error     = '';

    const req: NominaRequest = {
      trabajadorId:  this.trabajadorId,
      periodoInicio,
      periodoFin
    };

    this.nominaService.generar(req).subscribe({
      next: (n) => {
        this.nominaGenerada = n;
        this.generando      = false;
        this.cargarJornales();
        this.cdr.detectChanges();
      },
      error: () => {
        this.error     = 'workers.wages.list.errors.generate';
        this.generando = false;
        this.cdr.detectChanges();
      }
    });
  }

  verNominaCompleta(): void {
    if (!this.trabajadorId) return;
    this.cerrarPanel();
    this.router.navigate(['/worker/payrolls'], { queryParams: { trabajadorId: this.trabajadorId } });
  }

  irANuevoJornal(): void {
    this.router.navigate(['/worker/workdays/new'], {
      queryParams: this.trabajadorId ? { trabajadorId: this.trabajadorId } : {}
    });
  }

  volver(): void {
    this.router.navigate(['/worker']);
  }

  invalido(campo: string): boolean {
    const c = this.formNomina.get(campo);
    return !!(c?.invalid && c.touched);
  }
}
