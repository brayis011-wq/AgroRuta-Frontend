// src/app/features/worker/roster/list-roster/list-roster.ts

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import {
  NominaService,
  TrabajadorService,
  NominaRequest
} from '../../../../core/services/worker.service';
import { Nomina, ResumenNominas, Trabajador } from '../../../../core/models/worker.model';

type FiltroEstado = 'TODAS' | 'PENDIENTE' | 'APROBADA' | 'PAGADA' | 'ANULADA';
import { ConfirmService } from '../../../../shared/confirm-dialog/confirm.service';
import { PesosPipe, PeriodoPipe } from '../../../../shared/format.pipe';

@Component({
  selector: 'app-lista-nominas',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, TranslatePipe, PesosPipe, PeriodoPipe],
  templateUrl: './list-roster.html',
  styleUrls: ['../../../crop/crop-ui.css', '../../../crop/crop-blocks.css', '../../../report/report-table.css', '../../worker-ui.css', '../../worker-panel.css']
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
  cargando = true;
  error = '';                                   // clave de traducción
  exito = '';                                   // clave de traducción
  exitoParams: Record<string, unknown> = {};    // parámetros de la clave de éxito

  constructor(
    private fb: FormBuilder,
    private nominaService: NominaService,
    private trabajadorService: TrabajadorService,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private translate: TranslateService,
    private confirmService: ConfirmService
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      trabajadorId:  [null, Validators.required],
      periodoInicio: ['',   Validators.required],
      periodoFin:    ['',   Validators.required]
    });

    const idParam = this.route.snapshot.queryParamMap.get('trabajadorId');
    if (idParam) {
      this.trabajadorIdFiltro = Number(idParam);
      this.form.patchValue({ trabajadorId: this.trabajadorIdFiltro });
    }

    this.trabajadorService.listar().subscribe({
      next: (t: Trabajador[]) => {
        this.trabajadores = [...t];
        if (this.trabajadorIdFiltro != null) {
          this.trabajadorFiltrado = t.find(w => w.id === this.trabajadorIdFiltro) ?? null;
        }
        this.cdr.detectChanges();
      },
      error: () => {}
    });

    this.cargar();
  }

  /** Filtro rápido por estado de la tabla. Se aplica en el servidor: cambiarlo vuelve a la primera página. */
  get filtroEstado(): FiltroEstado { return this._filtroEstado; }
  set filtroEstado(valor: FiltroEstado) {
    if (valor === this._filtroEstado) return;
    this._filtroEstado = valor;
    this.cargarPagina(0);
  }

  /** Recarga la primera página y el resumen (después de generar, aprobar, anular, etc.) */
  cargar(): void {
    this.cargarPagina(0);
    this.nominaService.resumen(this.trabajadorIdFiltro).subscribe({
      next: (r) => {
        this.resumen = Object.fromEntries(r.map(x => [x.estado, x]));
        this.cdr.detectChanges();
      },
      error: () => {}
    });
  }

  cargarMas(): void {
    if (!this.hayMas || this.cargandoMas) return;
    this.cargarPagina(this.pagina + 1);
  }

  get hayMas(): boolean { return this.nominas.length < this.total; }

  private cargarPagina(pagina: number): void {
    if (pagina === 0) this.cargando = true; else this.cargandoMas = true;
    const estado = this._filtroEstado === 'TODAS' ? null : this._filtroEstado;
    this.nominaService.pagina(pagina, { trabajadorId: this.trabajadorIdFiltro, estado }).subscribe({
      next: (p) => {
        const nuevas = p.contenido.map(nomina => ({
          ...nomina,
          trabajadorId: nomina.trabajador?.id ?? nomina.trabajadorId ?? 0
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
      }
    });
  }

  /** Las nóminas de la tabla ya vienen filtradas por estado y trabajador desde el servidor */
  get visibles(): Nomina[] { return this.nominas; }

  cuenta(estado: string): number { return this.resumen[estado]?.cantidad ?? 0; }

  suma(estado: string): number { return this.resumen[estado]?.total ?? 0; }

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
    this.trabajadorFiltrado = null;
    this.trabajadorIdFiltro = null;
    this.form.patchValue({ trabajadorId: null });
    this.cargar();
  }

  generar(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.guardando = true;
    const val = this.form.value;
    const req: NominaRequest = {
      trabajadorId:  Number(val.trabajadorId),
      periodoInicio: val.periodoInicio,
      periodoFin:    val.periodoFin
    };
    this.nominaService.generar(req).subscribe({
      next: () => { this.cargar(); this.mostrarForm = false; this.guardando = false; },
      error: () => { this.error = 'workers.rosters.list.errors.generate'; this.guardando = false; this.cdr.detectChanges(); }
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
        setTimeout(() => { this.exito = ''; this.cdr.detectChanges(); }, 4000);
      },
      error: () => {
        this.error = 'workers.rosters.list.errors.approve';
        this.aprobando = null;
        this.cdr.detectChanges();
      }
    });
  }

  async anular(id: number | undefined): Promise<void> {
    if (id == null) return;
    if (!(await this.confirmar('workers.rosters.list.confirm.cancel', true))) return;
    this.nominaService.anular(id).subscribe({
      next: () => { this.cargar(); },
      error: () => { this.error = 'workers.rosters.list.errors.cancel'; this.cdr.detectChanges(); }
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
        setTimeout(() => { this.exito = ''; this.cdr.detectChanges(); }, 3500);
      },
      error: () => { this.error = 'workers.rosters.list.errors.reactivate'; this.cdr.detectChanges(); }
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
        setTimeout(() => { this.exito = ''; this.cdr.detectChanges(); }, 3500);
      },
      error: () => { this.error = 'workers.rosters.list.errors.delete'; this.cdr.detectChanges(); }
    });
  }

  estadoClass(estado: string): string {
    const mapa: Record<string, string> = {
      PENDIENTE: 'badge-borrador',
      APROBADA: 'badge-activo',
      PAGADA:   'badge-pagada',
      ANULADA:  'badge-inactivo'
    };
    return mapa[estado] ?? '';
  }

  invalido(n: string): boolean {
    const c = this.form.get(n);
    return !!(c?.invalid && c.touched);
  }
}
