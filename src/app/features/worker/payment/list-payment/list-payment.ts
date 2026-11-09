// src/app/features/worker/payment/list-payment/list-payment.ts

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { PesosPipe, FechaPipe, PeriodoPipe } from '../../../../shared/format.pipe';
import { PagoService, NominaService } from '../../../../core/services/worker.service';
import { Pago, Nomina, ResumenPagos } from '../../../../core/models/worker.model';

@Component({
  selector: 'app-lista-pagos',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslatePipe, PesosPipe, FechaPipe, PeriodoPipe],
  templateUrl: './list-payment.html',
  styleUrls: ['../../../crop/crop-ui.css', '../../../crop/crop-blocks.css', '../../../report/report-table.css', '../../worker-ui.css', '../../worker-panel.css', './list-payment.css']
})
export class ListaPagosComponent implements OnInit {
  /** Pagos cargados hasta ahora, del más reciente al más antiguo (se suman páginas con "Cargar más") */
  pagos: Pago[] = [];
  /** Pagos en total con el filtro actual, en todas las páginas */
  total = 0;
  private pagina = 0;
  cargandoMas = false;
  /** Totales calculados en el servidor (no dependen de las páginas cargadas) */
  resumen: ResumenPagos = { cantidad: 0, total: 0, trabajadores: 0 };
  cargando = false;
  error = '';   // clave de traducción

  // Filtro por nominaId desde query param
  nominaIdFiltro: number | null = null;

  // Panel de detalle
  pagoSeleccionado: Pago | null = null;
  nominaDetalle: Nomina | null = null;
  cargandoDetalle = false;

  get totalGlobal(): number { return this.resumen.total; }

  get totalPagos(): number { return this.resumen.cantidad; }

  get totalTrabajadores(): number { return this.resumen.trabajadores; }

  /** Ya vienen filtrados por nómina y ordenados desde el servidor */
  get visibles(): Pago[] { return this.pagos; }

  get ultimoPago(): Pago | null { return this.pagos[0] ?? null; }

  get hayMas(): boolean { return this.pagos.length < this.total; }

  constructor(
    private pagoService: PagoService,
    private nominaService: NominaService,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const nominaParam = this.route.snapshot.queryParamMap.get('nominaId');
    this.nominaIdFiltro = nominaParam ? Number(nominaParam) : null;

    this.cargar();
  }

  /** Primera página y totales con el filtro actual */
  cargar(): void {
    this.cargarPagina(0);
    this.pagoService.resumen(this.nominaIdFiltro).subscribe({
      next: (r) => { this.resumen = r; this.cdr.detectChanges(); },
      error: () => {}
    });
  }

  cargarMas(): void {
    if (!this.hayMas || this.cargandoMas) return;
    this.cargarPagina(this.pagina + 1);
  }

  private cargarPagina(pagina: number): void {
    if (pagina === 0) this.cargando = true; else this.cargandoMas = true;
    this.pagoService.pagina(pagina, this.nominaIdFiltro).subscribe({
      next: (p) => {
        this.pagos = pagina === 0 ? p.contenido : [...this.pagos, ...p.contenido];
        this.total = p.total;
        this.pagina = pagina;
        this.cargando = false;
        this.cargandoMas = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'workers.payments.errors.load';
        this.cargando = false;
        this.cargandoMas = false;
        this.cdr.detectChanges();
      }
    });
  }

  verTodos(): void {
    this.nominaIdFiltro = null;
    this.cargar();
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
