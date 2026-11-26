// src/app/features/worker/roster/list-roster/list-roster.ts

import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';

import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { guardarEnUrl, leerDeUrl } from '../../../../shared/url-state';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import {
  NominaService,
  TrabajadorService,
  NominaRequest,
  PagoService,
} from '../../../../core/services/worker.service';
import { AvisosService } from '../../../../core/services/toast.service';
import { semanaActual, semanaAnterior, semanaParaPagar } from './semana';
import { Nomina, ResumenNominas, Trabajador } from '../../../../core/models/worker.model';
import { iniciales as inicialesDe } from '../../../../shared/iniciales';
import { FlujoPagoComponent } from '../../pay-flow/pay-flow';
import { FiltroTrabajadorComponent } from '../../worker-filter/worker-filter';

type FiltroEstado = 'TODAS' | 'PENDIENTE' | 'APROBADA' | 'PAGADA' | 'ANULADA';
import { ConfirmService } from '../../../../shared/confirm-dialog/confirm.service';
import { PesosPipe, PeriodoPipe } from '../../../../shared/format.pipe';

@Component({
  selector: 'app-lista-nominas',
  standalone: true,
  imports: [
    RouterModule,
    ReactiveFormsModule,
    TranslatePipe,
    PesosPipe,
    PeriodoPipe,
    FlujoPagoComponent,
    FiltroTrabajadorComponent,
  ],
  templateUrl: './list-roster.html',
  styleUrls: [
    '../../../crop/crop-ui.css',
    '../../../crop/crop-blocks.css',
    '../../../report/report-table.css',
    '../../worker-ui.css',
    '../../worker-panel.css',
    '../../../../shared/styles/opciones.css',
    './list-roster.css',
  ],
})
export class ListaNominasComponent implements OnInit {
  /** Nóminas cargadas hasta ahora (se van sumando páginas con "Cargar más") */
  nominas: Nomina[] = [];
  /** Total de nóminas con los filtros actuales, en todas las páginas */
  total = 0;
  private pagina = 0;
  cargandoMas = false;
  /** Cantidad y valor por estado, calculados en el servidor (no dependen de las páginas cargadas) */
  private resumen: Record<string, ResumenNominas> = {};
  trabajadores: Trabajador[] = [];
  trabajadorFiltrado: Trabajador | null = null;
  /** Id del trabajador filtrado; llega en la URL antes de que cargue la lista de trabajadores */
  private trabajadorIdFiltro: number | null = null;
  form!: FormGroup;
  mostrarForm = false;
  guardando = false;
  aprobando: number | null = null;
  private _filtroEstado: FiltroEstado = 'TODAS';
  private readonly router = inject(Router);
  private readonly pagos = inject(PagoService);
  private readonly avisos = inject(AvisosService);

  // ── Nómina semanal de todo el equipo ──
  mostrarEquipo = false;
  equipoInicio = '';
  equipoFin = '';
  /** Las nóminas recién generadas para el equipo (para pagarlas juntas) */
  generadas: Nomina[] | null = null;
  metodoLote = 'EFECTIVO';
  procesandoLote = false;
  errorLote = '';
  /** Semana pasada y esta semana (lunes a domingo) */
  readonly semanas = [
    { ...semanaAnterior(new Date()), clave: 'workers.rosters.team.lastWeek' },
    { ...semanaActual(new Date()), clave: 'workers.rosters.team.thisWeek' },
  ];
  cargando = true;
  error = ''; // clave de traducción
  exito = ''; // clave de traducción
  exitoParams: Record<string, unknown> = {}; // parámetros de la clave de éxito

  constructor(
    private fb: FormBuilder,
    private nominaService: NominaService,
    private trabajadorService: TrabajadorService,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private translate: TranslateService,
    private confirmService: ConfirmService,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      trabajadorId: [null, Validators.required],
      periodoInicio: ['', Validators.required],
      periodoFin: ['', Validators.required],
    });

    // El filtro de estado viene en la dirección (?estado=PENDIENTE) si se volvió desde una nómina
    this._filtroEstado =
      (leerDeUrl(this.route, 'estado', [
        'PENDIENTE',
        'APROBADA',
        'PAGADA',
        'ANULADA',
      ]) as FiltroEstado | null) ?? 'TODAS';
    const idParam = this.route.snapshot.queryParamMap.get('trabajadorId');
    if (idParam) {
      this.trabajadorIdFiltro = Number(idParam);
      this.form.patchValue({ trabajadorId: this.trabajadorIdFiltro });
    }

    this.trabajadorService.listarTodos().subscribe({
      next: (t: Trabajador[]) => {
        this.trabajadores = [...t];
        if (this.trabajadorIdFiltro != null) {
          this.trabajadorFiltrado = t.find((w) => w.id === this.trabajadorIdFiltro) ?? null;
        }
        this.cdr.detectChanges();
      },
      error: () => {},
    });

    this.cargar();
    // Desde la planilla: abrir directamente la nómina del equipo con la semana que se estaba viendo
    const q = this.route.snapshot.queryParamMap;
    if (q.get('team')) this.abrirEquipo(q.get('desde'), q.get('hasta'));
  }

  /** Filtro rápido por estado de la tabla. Se aplica en el servidor: cambiarlo vuelve a la primera página. */
  get filtroEstado(): FiltroEstado {
    return this._filtroEstado;
  }
  set filtroEstado(valor: FiltroEstado) {
    if (valor === this._filtroEstado) return;
    this._filtroEstado = valor;
    guardarEnUrl(this.router, this.route, { estado: valor === 'TODAS' ? null : valor });
    this.cargarPagina(0);
  }

  /** Recarga la primera página y el resumen (después de generar, aprobar, anular, etc.) */
  cargar(): void {
    this.cargarPagina(0);
    this.nominaService.resumen(this.trabajadorIdFiltro).subscribe({
      next: (r) => {
        this.resumen = Object.fromEntries(r.map((x) => [x.estado, x]));
        this.cdr.detectChanges();
      },
      error: () => {},
    });
  }

  cargarMas(): void {
    if (!this.hayMas || this.cargandoMas) return;
    this.cargarPagina(this.pagina + 1);
  }

  get hayMas(): boolean {
    return this.nominas.length < this.total;
  }

  private cargarPagina(pagina: number): void {
    if (pagina === 0) this.cargando = true;
    else this.cargandoMas = true;
    const estado = this._filtroEstado === 'TODAS' ? null : this._filtroEstado;
    this.nominaService.pagina(pagina, { trabajadorId: this.trabajadorIdFiltro, estado }).subscribe({
      next: (p) => {
        const nuevas = p.contenido.map((nomina) => ({
          ...nomina,
          trabajadorId: nomina.trabajador?.id ?? nomina.trabajadorId ?? 0,
        }));
        this.nominas = pagina === 0 ? nuevas : [...this.nominas, ...nuevas];
        this.total = p.total;
        this.pagina = pagina;
        this.cargando = false;
        this.cargandoMas = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'workers.rosters.list.errors.load';
        this.cargando = false;
        this.cargandoMas = false;
        this.cdr.detectChanges();
      },
    });
  }

  /** Las nóminas de la tabla ya vienen filtradas por estado y trabajador desde el servidor */
  get visibles(): Nomina[] {
    return this.nominas;
  }

  cuenta(estado: string): number {
    return this.resumen[estado]?.cantidad ?? 0;
  }

  suma(estado: string): number {
    return this.resumen[estado]?.total ?? 0;
  }

  /** Nóminas del trabajador (o de todos) en todos los estados */
  get totalNominas(): number {
    return Object.values(this.resumen).reduce((a, r) => a + r.cantidad, 0);
  }

  /**
   * Permite generar nómina si:
   * - No hay filtro de trabajador (vista global), O
   * - El trabajador filtrado no tiene ninguna nómina en PENDIENTE, APROBADA o PAGADA
   */
  get puedeGenerarNomina(): boolean {
    if (!this.trabajadorFiltrado) return true;
    return this.cuenta('PENDIENTE') + this.cuenta('APROBADA') + this.cuenta('PAGADA') === 0;
  }

  verTodas(): void {
    this.filtrarTrabajador(null);
  }

  get trabajadorIdElegido(): number | null {
    return this.trabajadorIdFiltro;
  }

  /** Ver las nóminas de un trabajador o de todo el equipo (queda en la dirección) */
  filtrarTrabajador(id: number | null): void {
    this.trabajadorIdFiltro = id;
    this.trabajadorFiltrado =
      id == null ? null : (this.trabajadores.find((t) => t.id === id) ?? null);
    this.form.patchValue({ trabajadorId: id });
    guardarEnUrl(this.router, this.route, { trabajadorId: id });
    this.cargar();
  }

  generar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.guardando = true;
    const val = this.form.value;
    const req: NominaRequest = {
      trabajadorId: Number(val.trabajadorId),
      periodoInicio: val.periodoInicio,
      periodoFin: val.periodoFin,
    };
    this.nominaService.generar(req).subscribe({
      next: () => {
        this.cargar();
        this.mostrarForm = false;
        this.guardando = false;
      },
      error: () => {
        this.error = 'workers.rosters.list.errors.generate';
        this.guardando = false;
        this.cdr.detectChanges();
      },
    });
  }

  // ── Nómina semanal del equipo y pagos juntos ──

  abrirEquipo(desde?: string | null, hasta?: string | null): void {
    const fecha = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
    const s =
      desde && hasta && fecha.test(desde) && fecha.test(hasta)
        ? { inicio: desde, fin: hasta }
        : semanaParaPagar(new Date());
    this.equipoInicio = s.inicio;
    this.equipoFin = s.fin;
    this.generadas = null;
    this.errorLote = '';
    this.mostrarEquipo = true;
  }

  elegirSemana(q: { inicio: string; fin: string }): void {
    this.equipoInicio = q.inicio;
    this.equipoFin = q.fin;
  }

  generarEquipo(): void {
    if (!this.equipoInicio || !this.equipoFin || this.equipoFin < this.equipoInicio) {
      this.errorLote = 'workers.rosters.team.errors.dates';
      return;
    }
    this.procesandoLote = true;
    this.errorLote = '';
    this.nominaService.generarTodas(this.equipoInicio, this.equipoFin).subscribe({
      next: (n) => {
        this.generadas = n;
        this.procesandoLote = false;
        this.cargar();
        this.cdr.detectChanges();
      },
      error: (e) => {
        this.errorLote = e?.error?.message || 'workers.rosters.team.errors.generate';
        this.procesandoLote = false;
        this.cdr.detectChanges();
      },
    });
  }

  get totalGeneradas(): number {
    return (this.generadas ?? []).reduce((s, n) => s + (n.valorTotal ?? 0), 0);
  }

  /** Las nóminas recién generadas quedan pendientes: se cierran el panel y se muestran para revisarlas */
  revisarGeneradas(): void {
    this.mostrarEquipo = false;
    this.filtroEstado = 'PENDIENTE';
  }

  /** Pendientes de la lista: aprobarlas todas */
  get pendientesVisibles(): Nomina[] {
    return this.visibles.filter((n) => n.estado === 'PENDIENTE');
  }
  get aprobadasVisibles(): Nomina[] {
    return this.visibles.filter((n) => n.estado === 'APROBADA');
  }
  get totalAprobadasVisibles(): number {
    return this.aprobadasVisibles.reduce((s, n) => s + (n.valorTotal ?? 0), 0);
  }

  async aprobarVisibles(): Promise<void> {
    const ids = this.pendientesVisibles.map((n) => n.id!);
    if (!ids.length) return;
    const ok = await this.confirmService.preguntar({
      mensaje: this.translate.instant('workers.rosters.team.confirmApprove', { count: ids.length }),
    });
    if (!ok) return;
    this.procesandoLote = true;
    this.nominaService.aprobarVarias(ids).subscribe({
      next: () => {
        this.procesandoLote = false;
        this.avisos.exito('workers.rosters.team.approved', { count: ids.length });
        this.cargar();
      },
      error: () => {
        this.procesandoLote = false;
        this.error = 'workers.rosters.list.errors.approve';
        this.cdr.detectChanges();
      },
    });
  }

  async pagarVisibles(): Promise<void> {
    const ids = this.aprobadasVisibles.map((n) => n.id!);
    if (!ids.length) return;
    const ok = await this.confirmService.preguntar({
      mensaje: this.translate.instant('workers.rosters.team.confirmPay', {
        count: ids.length,
        method: this.translate.instant('enums.metodoPago.' + this.metodoLote),
      }),
    });
    if (!ok) return;
    this.pagarJuntas(ids, false);
  }

  private pagarJuntas(ids: number[], aprobarPendientes: boolean, alTerminar?: () => void): void {
    if (!ids.length) return;
    this.procesandoLote = true;
    this.errorLote = '';
    this.pagos.pagarVarias(ids, this.metodoLote, aprobarPendientes).subscribe({
      next: (p) => {
        this.procesandoLote = false;
        this.avisos.exito('workers.rosters.team.paid', { count: p.length });
        alTerminar?.();
        this.cargar();
      },
      error: (e) => {
        this.procesandoLote = false;
        this.errorLote = e?.error?.message || 'workers.rosters.team.errors.pay';
        this.error = this.errorLote;
        this.cdr.detectChanges();
      },
    });
  }

  private confirmar(clave: string, peligro = false): Promise<boolean> {
    return this.confirmService.preguntar({ mensaje: this.translate.instant(clave), peligro });
  }

  /**
   * Aprueba la nómina (PENDIENTE → APROBADA).
   * El pago se registra después desde el detalle de la nómina.
   */
  async aprobar(id: number | undefined): Promise<void> {
    if (id == null) return;
    if (!(await this.confirmar('workers.rosters.list.confirm.approve'))) return;

    this.aprobando = id;
    this.error = '';
    this.exito = '';

    this.nominaService.aprobar(id).subscribe({
      next: () => {
        this.aprobando = null;
        this.exito = 'workers.rosters.list.success.approved';
        this.exitoParams = {};
        this.cargar();
        this.cdr.detectChanges();
        setTimeout(() => {
          this.exito = '';
          this.cdr.detectChanges();
        }, 4000);
      },
      error: () => {
        this.error = 'workers.rosters.list.errors.approve';
        this.aprobando = null;
        this.cdr.detectChanges();
      },
    });
  }

  async anular(id: number | undefined): Promise<void> {
    if (id == null) return;
    if (!(await this.confirmar('workers.rosters.list.confirm.cancel', true))) return;
    this.nominaService.anular(id).subscribe({
      next: () => {
        this.cargar();
      },
      error: (e) => {
        this.error = e?.error?.message || 'workers.rosters.list.errors.cancel';
        this.cdr.detectChanges();
      },
    });
  }

  async reactivar(id: number | undefined): Promise<void> {
    if (id == null) return;
    if (!(await this.confirmar('workers.rosters.list.confirm.reactivate'))) return;
    this.nominaService.reactivar(id).subscribe({
      next: () => {
        this.exito = 'workers.rosters.list.success.reactivated';
        this.exitoParams = {};
        this.cargar();
        this.cdr.detectChanges();
        setTimeout(() => {
          this.exito = '';
          this.cdr.detectChanges();
        }, 3500);
      },
      error: () => {
        this.error = 'workers.rosters.list.errors.reactivate';
        this.cdr.detectChanges();
      },
    });
  }

  async eliminar(id: number | undefined): Promise<void> {
    if (id == null) return;
    if (!(await this.confirmar('workers.rosters.list.confirm.delete', true))) return;
    this.nominaService.eliminar(id).subscribe({
      next: () => {
        this.cargar();
        this.exito = 'workers.rosters.list.success.deleted';
        this.exitoParams = {};
        this.cdr.detectChanges();
        setTimeout(() => {
          this.exito = '';
          this.cdr.detectChanges();
        }, 3500);
      },
      error: (e) => {
        this.error = e?.error?.message || 'workers.rosters.list.errors.delete';
        this.cdr.detectChanges();
      },
    });
  }

  iniciales(t: Trabajador | null | undefined): string {
    return inicialesDe(t?.nombre, t?.apellido ?? null);
  }

  estadoClass(estado: string): string {
    const mapa: Record<string, string> = {
      PENDIENTE: 'badge-borrador',
      APROBADA: 'badge-activo',
      PAGADA: 'badge-pagada',
      ANULADA: 'badge-inactivo',
    };
    return mapa[estado] ?? '';
  }

  invalido(n: string): boolean {
    const c = this.form.get(n);
    return !!(c?.invalid && c.touched);
  }
}
