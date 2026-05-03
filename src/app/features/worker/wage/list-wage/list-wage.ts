import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { JornalService, TrabajadorService, NominaService, NominaRequest } from '../../../../core/services/worker.service';
import { Jornal, Trabajador, Nomina } from '../../../../core/models/worker.model';

@Component({
  selector: 'app-lista-jornales',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule],
  templateUrl: './list-wage.html',
  styleUrls: ['./list-wage.css']
})
export class ListaJornalesComponent implements OnInit {

  jornales:   Jornal[]      = [];
  trabajador: Trabajador | null = null;
  nominaGenerada: Nomina | null = null;

  trabajadorId: number | null = null;
  busqueda    = '';
  fechaInicio = '';
  fechaFin    = '';
  cargando    = false;
  error       = '';
  exito       = '';

  // Panel generar nómina
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

    this.route.queryParams.subscribe(params => {
      const idParam = params['trabajadorId'];
      if (idParam) {
        this.trabajadorId = Number(idParam);
        this.cargarTrabajador();
        this.cargarJornales();
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

  cargarJornales(): void {
    if (!this.trabajadorId) return;
    this.cargando = true;
    this.error    = '';
    this.cdr.detectChanges();

    this.jornalService.porTrabajador(
      this.trabajadorId,
      this.fechaInicio || undefined,
      this.fechaFin    || undefined
    ).subscribe({
      next: (j) => {
        this.jornales = j;
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error    = 'Error al cargar jornales';
        this.cargando = false;
        this.cdr.detectChanges();
      }
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

  get totalJornales(): number {
    return this.filtrados.reduce((a, j) => a + (j.valorJornal ?? 0), 0);
  }

  get pendientes(): number {
    return this.filtrados.filter(j => !j.liquidado).length;
  }

  get totalPendiente(): number {
    return this.filtrados
      .filter(j => !j.liquidado)
      .reduce((a, j) => a + (j.valorJornal ?? 0), 0);
  }

  // ── Panel nómina ─────────────────────────────────────────────────────────

  abrirGenerarNomina(): void {
    // Precargar fechas con el rango de jornales pendientes si existen
    const pendientes = this.filtrados.filter(j => !j.liquidado);
    if (pendientes.length > 0) {
      const fechas = pendientes
        .map(j => j.fecha ? new Date(j.fecha).getTime() : 0)
        .filter(f => f > 0);
      if (fechas.length) {
        const min = new Date(Math.min(...fechas)).toISOString().split('T')[0];
        const max = new Date(Math.max(...fechas)).toISOString().split('T')[0];
        this.formNomina.patchValue({ periodoInicio: min, periodoFin: max });
      }
    } else {
      this.formNomina.reset();
    }
    this.nominaGenerada = null;
    this.error  = '';
    this.panelNomina = true;
    this.cdr.detectChanges();
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
      this.error = 'La fecha fin no puede ser anterior a la fecha inicio';
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
        // Recargar jornales — algunos pasarán a liquidado: true
        this.cargarJornales();
        this.cdr.detectChanges();
      },
      error: () => {
        this.error     = 'Error al generar nómina. Verifica que haya jornales sin liquidar en el período.';
        this.generando = false;
        this.cdr.detectChanges();
      }
    });
  }

  verNominaCompleta(): void {
    if (!this.trabajadorId) return;
    this.cerrarPanel();
    this.router.navigate(['/worker/nominas'], { queryParams: { trabajadorId: this.trabajadorId } });
  }

  irANuevoJornal(): void {
    this.router.navigate(['/worker/jornales/nuevo'], {
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
