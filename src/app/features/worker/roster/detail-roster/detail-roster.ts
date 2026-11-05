// src/app/features/worker/roster/detail-roster/detail-roster.ts

import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import {
  NominaService,
  PagoService,
  PagoRequest
} from '../../../../core/services/worker.service';
import { Nomina, Pago } from '../../../../core/models/worker.model';
import { ConfirmService } from '../../../../shared/confirm-dialog/confirm.service';
import { PesosPipe, FechaPipe, PeriodoPipe } from '../../../../shared/formato.pipe';

@Component({
  selector: 'app-detalle-nomina',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, TranslatePipe, PesosPipe, FechaPipe, PeriodoPipe],
  templateUrl: './detail-roster.html',
  styleUrls: ['../../../cultivo/cultivo-ui.css', '../../../cultivo/cultivo-bloques.css', '../../../report/report-tabla.css', '../../worker-ui.css', '../../worker-panel.css', './detail-roster.css']
})
export class DetalleNominaComponent implements OnInit {
  private readonly confirmService = inject(ConfirmService);
  nomina: Nomina | null = null;
  pagos: Pago[] = [];
  cargando = true;
  guardando = false;
  error = '';                                   // clave de traducción
  exito = '';                                   // clave de traducción
  exitoParams: Record<string, unknown> = {};    // parámetros de la clave de éxito

  /** Métodos que acepta el backend (enum MetodoPago). */
  readonly metodosPago = ['EFECTIVO', 'TRANSFERENCIA', 'CHEQUE'];
  mostrarFormPago = false;
  pagoForm: FormGroup;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private nominaService: NominaService,
    private pagoService: PagoService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private translate: TranslateService
  ) {
    this.pagoForm = this.fb.group({
      metodoPago:    ['EFECTIVO', Validators.required],
      comprobante:   ['', Validators.maxLength(100)],
      observaciones: ['', Validators.maxLength(500)]
    });
  }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.cargarNomina(id);
  }

  private cargarNomina(id: number): void {
    this.cargando = true;
    this.nominaService.obtener(id).subscribe({
      next: (n: Nomina) => {
        this.nomina = n;
        this.cargando = false;
        // El pago existe solo cuando la nómina está PAGADA
        if (n.estado === 'PAGADA' && n.id) {
          this.cargarPagos(n.id);
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'workers.rosters.detail.errors.load';
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  private cargarPagos(nominaId: number): void {
    // Cargamos todos los pagos y filtramos por nominaId
    this.pagoService.listarTodos().subscribe({
      next: (pagos: Pago[]) => {
        this.pagos = pagos.filter(p => p.nominaId === nominaId);
        this.cdr.detectChanges();
      },
      error: () => {}
    });
  }

  /**
   * Aprueba la nómina (PENDIENTE → APROBADA). El pago se registra después, en otro paso.
   */
  async aprobar(): Promise<void> {
    if (!this.nomina?.id) return;
    const mensaje = this.translate.instant('workers.rosters.detail.confirm.approve');
    if (!(await this.confirmService.preguntar({ mensaje }))) return;

    this.guardando = true;
    this.error = '';
    this.exito = '';

    this.nominaService.aprobar(this.nomina.id).subscribe({
      next: (nominaAprobada: Nomina) => {
        this.nomina = nominaAprobada;
        this.guardando = false;
        this.mostrarFormPago = true;
        this.mostrarExito('workers.rosters.detail.success.approved');
      },
      error: () => {
        this.error = 'workers.rosters.detail.errors.approve';
        this.guardando = false;
        this.cdr.detectChanges();
      }
    });
  }

  abrirFormPago(): void {
    this.pagoForm.reset({ metodoPago: 'EFECTIVO', comprobante: '', observaciones: '' });
    this.mostrarFormPago = true;
    this.error = '';
  }

  /**
   * Registra el pago por el valor total de la nómina (APROBADA → PAGADA).
   */
  registrarPago(): void {
    if (!this.nomina?.id || this.pagoForm.invalid) {
      this.pagoForm.markAllAsTouched();
      return;
    }

    const val = this.pagoForm.value;
    const req: PagoRequest = {
      nominaId:      this.nomina.id,
      monto:         this.nomina.valorTotal,
      metodoPago:    val.metodoPago,
      comprobante:   val.comprobante?.trim() || undefined,
      observaciones: val.observaciones?.trim() || undefined
    };

    this.guardando = true;
    this.error = '';
    this.exito = '';

    this.pagoService.registrar(req).subscribe({
      next: (p: Pago) => {
        this.pagos = [p];
        this.guardando = false;
        this.mostrarFormPago = false;
        this.nomina = { ...this.nomina!, estado: 'PAGADA' };
        this.mostrarExito('workers.rosters.detail.success.paid', {
          amount: this.nomina.valorTotal.toLocaleString(),
          method: this.translate.instant('enums.metodoPago.' + req.metodoPago)
        });
        // Recarga para ver los jornales marcados como liquidados
        this.cargarNomina(this.nomina.id!);
      },
      error: (err) => {
        this.guardando = false;
        this.error = err?.error?.message || 'workers.rosters.detail.errors.payment';
        this.cdr.detectChanges();
      }
    });
  }

  private mostrarExito(clave: string, params: Record<string, unknown> = {}): void {
    this.exito = clave;
    this.exitoParams = params;
    this.cdr.detectChanges();
    setTimeout(() => { this.exito = ''; this.cdr.detectChanges(); }, 4000);
  }

  async anular(): Promise<void> {
    if (!this.nomina?.id) return;
    const mensaje = this.translate.instant('workers.rosters.detail.confirm.cancel');
    if (!(await this.confirmService.preguntar({ mensaje, peligro: true }))) return;
    this.guardando = true;
    this.nominaService.anular(this.nomina.id).subscribe({
      next: () => {
        this.cargarNomina(this.nomina!.id!);
        this.guardando = false;
      },
      error: () => {
        this.error = 'workers.rosters.detail.errors.cancel';
        this.guardando = false;
        this.cdr.detectChanges();
      }
    });
  }

  verPago(): void {
    this.router.navigate(['/worker/pagos'], {
      queryParams: { nominaId: this.nomina?.id }
    });
  }

  /** Paso del flujo en que va la nómina: 1 generada, 2 aprobada, 3 pagada (0 si se anuló) */
  get paso(): number {
    switch (this.nomina?.estado) {
      case 'PENDIENTE': return 1;
      case 'APROBADA': return 2;
      case 'PAGADA': return 3;
      default: return 0;
    }
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
}
