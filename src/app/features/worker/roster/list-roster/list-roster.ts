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
import { Nomina, Trabajador } from '../../../../core/models/worker.model';
import { ConfirmService } from '../../../../shared/confirm-dialog/confirm.service';
import { PesosPipe, PeriodoPipe } from '../../../../shared/formato.pipe';

@Component({
  selector: 'app-lista-nominas',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, TranslatePipe, PesosPipe, PeriodoPipe],
  templateUrl: './list-roster.html',
  styleUrls: ['../../../cultivo/cultivo-ui.css', '../../../cultivo/cultivo-bloques.css', '../../../report/report-tabla.css', '../../worker-ui.css', '../../worker-panel.css']
})
export class ListaNominasComponent implements OnInit {
  todasLasNominas: Nomina[] = [];
  nominas: Nomina[] = [];
  trabajadores: Trabajador[] = [];
  trabajadorFiltrado: Trabajador | null = null;
  form!: FormGroup;
  mostrarForm = false;
  guardando = false;
  aprobando: number | null = null;
  /** Filtro rápido por estado de la tabla */
  filtroEstado: 'TODAS' | 'PENDIENTE' | 'APROBADA' | 'PAGADA' | 'ANULADA' = 'TODAS';
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

    this.trabajadorService.listar().subscribe({
      next: (t: Trabajador[]) => {
        this.trabajadores = [...t];
        const idParam = this.route.snapshot.queryParamMap.get('trabajadorId');
        if (idParam) {
          const id = Number(idParam);
          this.trabajadorFiltrado = t.find(w => w.id === id) ?? null;
          this.form.patchValue({ trabajadorId: id });
        }
        this.cdr.detectChanges();
      },
      error: () => {}
    });

    this.cargar();
  }

  cargar(): void {
    this.nominaService.listarTodas().subscribe({
      next: (n: Nomina[]) => {
        this.todasLasNominas = n.map(nomina => ({
          ...nomina,
          trabajadorId: nomina.trabajador?.id ?? nomina.trabajadorId ?? 0
        }));
        this.aplicarFiltro();
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => { this.error = 'workers.rosters.list.errors.load'; this.cargando = false; this.cdr.detectChanges(); }
    });
  }

  aplicarFiltro(): void {
    if (this.trabajadorFiltrado) {
      this.nominas = this.todasLasNominas.filter(n =>
        n.trabajador?.id === this.trabajadorFiltrado!.id ||
        n.trabajadorId   === this.trabajadorFiltrado!.id
      );
    } else {
      this.nominas = this.todasLasNominas;
    }
  }

  /**
   * Permite generar nómina si:
   * - No hay filtro de trabajador (vista global), O
   * - El trabajador filtrado no tiene ninguna nómina en PENDIENTE, APROBADA o PAGADA
   */
  get visibles(): Nomina[] {
    return this.filtroEstado === 'TODAS' ? this.nominas : this.nominas.filter(n => n.estado === this.filtroEstado);
  }

  cuenta(estado: string): number { return this.nominas.filter(n => n.estado === estado).length; }

  suma(estado: string): number {
    return this.nominas.filter(n => n.estado === estado).reduce((a, n) => a + (n.valorTotal ?? 0), 0);
  }

  get puedeGenerarNomina(): boolean {
    if (!this.trabajadorFiltrado) return true;
    return !this.nominas.some(n =>
      n.estado === 'PENDIENTE' || n.estado === 'APROBADA' || n.estado === 'PAGADA'
    );
  }

  verTodas(): void {
    this.trabajadorFiltrado = null;
    this.form.patchValue({ trabajadorId: null });
    this.aplicarFiltro();
    this.cdr.detectChanges();
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
        this.todasLasNominas = this.todasLasNominas.filter(n => n.id !== id);
        this.aplicarFiltro();
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
