// src/app/features/worker/payment/list-payment/list-payment.ts

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { PagoService, NominaService } from '../../../../core/services/worker.service';
import { Pago, Nomina } from '../../../../core/models/worker.model';

export interface GrupoPago {
  trabajadorNombre: string;
  pagos: Pago[];
  total: number;
}

@Component({
  selector: 'app-lista-pagos',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './list-payment.html',
  styleUrls: ['./list-payment.css']
})
export class ListaPagosComponent implements OnInit {
  pagos: Pago[] = [];
  grupos: GrupoPago[] = [];
  cargando = false;
  error = '';

  // Filtro por nominaId desde query param
  nominaIdFiltro: number | null = null;

  // Panel de detalle
  pagoSeleccionado: Pago | null = null;
  nominaDetalle: Nomina | null = null;
  cargandoDetalle = false;

  get totalGlobal(): number {
    return this.grupos.reduce((acc, g) => acc + g.total, 0);
  }

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
        this.error = 'Error al cargar pagos';
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
      const nombre = p.trabajadorNombre ?? 'Sin nombre';
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

  iniciales(nombre: string): string {
    return nombre.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  }
}
