// src/app/features/worker/roster/detail-roster/detail-roster.ts

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
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

@Component({
  selector: 'app-detalle-nomina',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, TranslatePipe],
  templateUrl: './detail-roster.html',
  styleUrls: ['./detail-roster.css']
})
export class DetalleNominaComponent implements OnInit {
  nomina: Nomina | null = null;
  pagos: Pago[] = [];
  cargando = true;
  guardando = false;
  error = '';                                   // clave de traducción
  exito = '';                                   // clave de traducción
  exitoParams: Record<string, unknown> = {};    // parámetros de la clave de éxito

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private nominaService: NominaService,
    private pagoService: PagoService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private translate: TranslateService
  ) {}

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
        // Si ya está aprobada, cargar sus pagos
        if (n.estado === 'APROBADA' && n.id) {
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
   * Aprueba la nómina y registra el pago automáticamente en EFECTIVO.
   */
  aprobar(): void {
    if (!this.nomina?.id) return;
    if (!confirm(this.translate.instant('workers.rosters.detail.confirm.approve'))) return;

    this.guardando = true;
    this.error = '';
    this.exito = '';

    this.nominaService.aprobar(this.nomina.id).subscribe({
      next: (nominaAprobada: Nomina) => {
        this.nomina = nominaAprobada;

        const pagoReq: PagoRequest = {
          nominaId:   nominaAprobada.id!,
          monto:      nominaAprobada.valorTotal,
          metodoPago: 'EFECTIVO'
        };

        this.pagoService.registrar(pagoReq).subscribe({
          next: (p: Pago) => {
            this.pagos = [p];
            this.guardando = false;
            this.exito = 'workers.rosters.detail.success.approvedCash';
            this.exitoParams = { amount: nominaAprobada.valorTotal.toLocaleString() };
            this.cdr.detectChanges();
            setTimeout(() => { this.exito = ''; this.cdr.detectChanges(); }, 4000);
          },
          error: () => {
            this.guardando = false;
            this.error = 'workers.rosters.detail.errors.paymentAfterApprove';
            this.cdr.detectChanges();
          }
        });
      },
      error: () => {
        this.error = 'workers.rosters.detail.errors.approve';
        this.guardando = false;
        this.cdr.detectChanges();
      }
    });
  }

  anular(): void {
    if (!this.nomina?.id || !confirm(this.translate.instant('workers.rosters.detail.confirm.cancel'))) return;
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
