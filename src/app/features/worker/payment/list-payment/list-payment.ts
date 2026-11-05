// src/app/features/worker/payment/list-payment/list-payment.ts

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { PesosPipe, FechaPipe, PeriodoPipe } from '../../../../shared/formato.pipe';
import { PagoService, NominaService } from '../../../../core/services/worker.service';
import { Pago, Nomina } from '../../../../core/models/worker.model';

export interface GrupoPago {
  trabajadorNombre: string;   // vacío = sin nombre (la plantilla muestra el texto traducido)
  pagos: Pago[];
  total: number;
}

@Component({
  selector: 'app-lista-pagos',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslatePipe, PesosPipe, FechaPipe, PeriodoPipe],
  templateUrl: './list-payment.html',
  styleUrls: ['../../../cultivo/cultivo-ui.css', '../../../cultivo/cultivo-bloques.css', '../../../report/report-tabla.css', '../../worker-ui.css', '../../worker-panel.css', './list-payment.css']
})
export class ListaPagosComponent implements OnInit {
  pagos: Pago[] = [];
  grupos: GrupoPago[] = [];
  cargando = false;
  error = '';   // clave de traducción

  // Filtro por nominaId desde query param
  nominaIdFiltro: number | null = null;

  // Panel de detalle
  pagoSeleccionado: Pago | null = null;
  nominaDetalle: Nomina | null = null;
  cargandoDetalle = false;

  get totalGlobal(): number {
    return this.grupos.reduce((acc, g) => acc + g.total, 0);
  }

  /** Pagos visibles (filtrados por nómina si viene en la URL), del más reciente al más antiguo */
  get visibles(): Pago[] {
    const lista = this.nominaIdFiltro ? this.pagos.filter(p => p.nominaId === this.nominaIdFiltro) : this.pagos;
    return [...lista].sort((a, b) => String(b.fechaPago ?? b.fecha ?? '').localeCompare(String(a.fechaPago ?? a.fecha ?? '')));
  }

  get ultimoPago(): Pago | null { return this.visibles[0] ?? null; }

  get totalPagos(): number {
    return this.grupos.reduce((acc, g) => acc + g.pagos.length, 0);
  }

  constructor(
    private pagoService: PagoService,
    private nominaService: NominaService,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const nominaParam = this.route.snapshot.queryParamMap.get('nominaId');
    this.nominaIdFiltro = nominaParam ? Number(nominaParam) : null;

    this.cargando = true;
    this.pagoService.listarTodos().subscribe({
      next: (p: Pago[]) => {
        this.pagos = p;
        this.agrupar();
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'workers.payments.errors.load';
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  private agrupar(): void {
    const pagosVer = this.nominaIdFiltro
      ? this.pagos.filter(p => p.nominaId === this.nominaIdFiltro)
      : this.pagos;

    const mapa = new Map<string, Pago[]>();
    for (const p of pagosVer) {
      const nombre = p.trabajadorNombre ?? '';
      if (!mapa.has(nombre)) mapa.set(nombre, []);
      mapa.get(nombre)!.push(p);
    }

    this.grupos = Array.from(mapa.entries()).map(([nombre, pagos]) => ({
      trabajadorNombre: nombre,
      pagos,
      total: pagos.reduce((acc, p) => acc + (p.monto ?? 0), 0)
    }));
  }

  verTodos(): void {
    this.nominaIdFiltro = null;
    this.agrupar();
    this.cdr.detectChanges();
  }

  // ── Panel detalle ─────────────────────────────────────────────────────────

  abrirDetalle(pago: Pago): void {
    this.pagoSeleccionado = pago;
    this.nominaDetalle = null;
    this.cargandoDetalle = true;

    if (pago.nominaId) {
      this.nominaService.obtener(pago.nominaId).subscribe({
        next: (n: Nomina) => {
          this.nominaDetalle = n;
          this.cargandoDetalle = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.cargandoDetalle = false;
          this.cdr.detectChanges();
        }
      });
    } else {
      this.cargandoDetalle = false;
    }
  }

  cerrarDetalle(): void {
    this.pagoSeleccionado = null;
    this.nominaDetalle = null;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  metodoPagoIcon(metodo?: string): string {
    const iconos: Record<string, string> = {
      EFECTIVO:      '💵',
      TRANSFERENCIA: '🏦',
      CHEQUE:        '📄',
      NEQUI:         '📱',
      DAVIPLATA:     '📱',
    };
    return metodo ? (iconos[metodo] ?? '💳') : '💳';
  }

  /** Ícono (Tabler) del método de pago */
  metodoIcono(metodo?: string): string {
    const iconos: Record<string, string> = {
      EFECTIVO: 'ti-cash', TRANSFERENCIA: 'ti-building-bank', CHEQUE: 'ti-file-dollar', NEQUI: 'ti-device-mobile', DAVIPLATA: 'ti-device-mobile',
    };
    return metodo ? (iconos[metodo] ?? 'ti-credit-card') : 'ti-credit-card';
  }

  iniciales(nombre: string): string {
    if (!nombre) return '?';
    return nombre.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  }
}
