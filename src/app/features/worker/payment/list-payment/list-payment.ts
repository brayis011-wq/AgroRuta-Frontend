// src/app/features/worker/payment/list-payment/list-payment.ts

import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  ChangeDetectorRef,
  inject,
} from '@angular/core';

import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { guardarEnUrl } from '../../../../shared/url-state';
import { FiltroTrabajadorComponent } from '../../worker-filter/worker-filter';
import { TranslatePipe } from '@ngx-translate/core';
import { PesosPipe, FechaPipe, PeriodoPipe } from '../../../../shared/format.pipe';
import {
  PagoService,
  NominaService,
  TrabajadorService,
} from '../../../../core/services/worker.service';
import { Pago, Nomina, ResumenPagos, Trabajador } from '../../../../core/models/worker.model';
import { descargarArchivo, numeroComprobante } from '../../../../shared/download';
import { iniciales as inicialesDe } from '../../../../shared/iniciales';
import { FlujoPagoComponent } from '../../pay-flow/pay-flow';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-lista-pagos',
  standalone: true,
  imports: [
    RouterModule,
    TranslatePipe,
    PesosPipe,
    FechaPipe,
    PeriodoPipe,
    FlujoPagoComponent,
    FiltroTrabajadorComponent,
  ],
  templateUrl: './list-payment.html',
  styleUrls: [
    '../../../crop/crop-ui.css',
    '../../../crop/crop-blocks.css',
    '../../../report/report-table.css',
    '../../worker-ui.css',
    '../../worker-panel.css',
    './list-payment.css',
  ],
})
export class ListaPagosComponent implements OnInit {
  private readonly pagoService = inject(PagoService);
  private readonly nominaService = inject(NominaService);
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);

  /** Pagos cargados hasta ahora, del más reciente al más antiguo (se suman páginas con "Cargar más") */
  pagos: Pago[] = [];
  /** Pagos en total con el filtro actual, en todas las páginas */
  total = 0;
  private pagina = 0;
  cargandoMas = false;
  /** Totales calculados en el servidor (no dependen de las páginas cargadas) */
  resumen: ResumenPagos = { cantidad: 0, total: 0, trabajadores: 0 };
  cargando = false;
  error = ''; // clave de traducción

  // Filtro por nominaId desde query param
  nominaIdFiltro: number | null = null;
  /** Trabajador elegido en el filtro; null = todo el equipo */
  trabajadorIdFiltro: number | null = null;
  trabajadores: Trabajador[] = [];
  private readonly trabajadorService = inject(TrabajadorService);
  private readonly router = inject(Router);

  // Panel de detalle
  pagoSeleccionado: Pago | null = null;
  nominaDetalle: Nomina | null = null;
  cargandoDetalle = false;
  /** Id del pago cuyo comprobante se está descargando */
  descargando: number | null = null;
  errorComprobante = false;

  get totalGlobal(): number {
    return this.resumen.total;
  }

  get totalPagos(): number {
    return this.resumen.cantidad;
  }

  get totalTrabajadores(): number {
    return this.resumen.trabajadores;
  }

  /** Ya vienen filtrados por nómina y ordenados desde el servidor */
  get visibles(): Pago[] {
    return this.pagos;
  }

  get ultimoPago(): Pago | null {
    return this.pagos[0] ?? null;
  }

  get hayMas(): boolean {
    return this.pagos.length < this.total;
  }

  ngOnInit(): void {
    const nominaParam = this.route.snapshot.queryParamMap.get('nominaId');
    this.nominaIdFiltro = nominaParam ? Number(nominaParam) : null;
    const trabajadorParam = this.route.snapshot.queryParamMap.get('trabajadorId');
    this.trabajadorIdFiltro = trabajadorParam ? Number(trabajadorParam) : null;
    this.trabajadorService.listarTodos().subscribe({
      next: (t) => {
        this.trabajadores = t;
        this.cdr.detectChanges();
      },
      error: () => {
        // Si falla, la pantalla sigue con lo que ya mostraba
      },
    });

    this.cargar();
  }

  /** Primera página y totales con el filtro actual */
  cargar(): void {
    this.cargarPagina(0);
    this.pagoService.resumen(this.nominaIdFiltro, this.trabajadorIdFiltro).subscribe({
      next: (r) => {
        this.resumen = r;
        this.cdr.detectChanges();
      },
      error: () => {
        // Si falla, la pantalla sigue con lo que ya mostraba
      },
    });
  }

  cargarMas(): void {
    if (!this.hayMas || this.cargandoMas) return;
    this.cargarPagina(this.pagina + 1);
  }

  private cargarPagina(pagina: number): void {
    if (pagina === 0) this.cargando = true;
    else this.cargandoMas = true;
    this.pagoService
      .pagina(pagina, this.nominaIdFiltro, undefined, this.trabajadorIdFiltro)
      .subscribe({
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
        },
      });
  }

  verTodos(): void {
    this.nominaIdFiltro = null;
    guardarEnUrl(this.router, this.route, { nominaId: null });
    this.cargar();
  }

  /** Ver los pagos de un trabajador o de todo el equipo (queda en la dirección) */
  filtrarTrabajador(id: number | null): void {
    this.trabajadorIdFiltro = id;
    this.nominaIdFiltro = null;
    guardarEnUrl(this.router, this.route, { trabajadorId: id, nominaId: null });
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
        },
      });
    } else {
      this.cargandoDetalle = false;
    }
  }

  cerrarDetalle(): void {
    this.pagoSeleccionado = null;
    this.nominaDetalle = null;
    this.errorComprobante = false;
  }

  descargarComprobante(pago: Pago): void {
    if (!pago.id || this.descargando) return;
    this.descargando = pago.id;
    this.errorComprobante = false;
    this.pagoService.comprobante(pago.id).subscribe({
      next: (pdf) => {
        descargarArchivo(pdf, `comprobante-${numeroComprobante(pago.id!)}.pdf`);
        this.descargando = null;
        this.cdr.detectChanges();
      },
      error: () => {
        this.descargando = null;
        this.errorComprobante = true;
        this.cdr.detectChanges();
      },
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /** Ícono (Tabler) del método de pago */
  metodoIcono(metodo?: string): string {
    const iconos: Record<string, string> = {
      EFECTIVO: 'ti-cash',
      TRANSFERENCIA: 'ti-building-bank',
      CHEQUE: 'ti-file-dollar',
    };
    return metodo ? (iconos[metodo] ?? 'ti-credit-card') : 'ti-credit-card';
  }

  /** Las del backend (nombre y apellido por separado); sin ellas, del nombre completo */
  iniciales(nombre: string, calculadas?: string | null): string {
    return calculadas || inicialesDe(nombre);
  }
}
