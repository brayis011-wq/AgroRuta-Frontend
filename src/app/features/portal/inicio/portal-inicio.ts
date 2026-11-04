import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { AsyncPipe, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { forkJoin } from 'rxjs';
import { PortalService } from '../../../core/services/portal.service';
import { LanguageService } from '../../../core/services/language.service';
import { EstadoPortal, MiJornal, MiNomina, MiPago } from '../../../core/models/portal.model';
import { formatoFecha, formatoNumero, formatoPesos } from '../../../shared/formato';

@Component({
  selector: 'app-portal-inicio',
  standalone: true,
  imports: [CommonModule, AsyncPipe, FormsModule, RouterModule, TranslatePipe],
  templateUrl: './portal-inicio.html',
  styleUrls: ['../../../shared/styles/panel-page.css', './portal-inicio.css'],
})
export class PortalInicioComponent implements OnInit {
  readonly portal = inject(PortalService);
  private readonly lang = inject(LanguageService);
  private readonly cdr = inject(ChangeDetectorRef);

  // Solicitud de acceso
  cedula = '';
  enviando = false;
  errorSolicitud = '';

  // Resumen (solo con acceso aprobado)
  jornales: MiJornal[] = [];
  nominas: MiNomina[] = [];
  pagos: MiPago[] = [];
  cargandoDatos = false;
  errorDatos = false;
  private datosCargados = false;

  ngOnInit(): void {
    this.portal.estado$.subscribe((e) => {
      if (e?.estado === 'APROBADO' && !this.datosCargados) this.cargarDatos();
    });
  }

  cargarDatos(): void {
    this.datosCargados = true;
    this.cargandoDatos = true;
    this.errorDatos = false;
    forkJoin({ j: this.portal.jornales(), n: this.portal.nominas(), p: this.portal.pagos() }).subscribe({
      next: ({ j, n, p }) => {
        this.jornales = j;
        this.nominas = n;
        this.pagos = p;
        this.cargandoDatos = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorDatos = true;
        this.cargandoDatos = false;
        this.datosCargados = false;
        this.cdr.detectChanges();
      },
    });
  }

  actualizarEstado(): void {
    this.portal.cargarEstado().subscribe();
  }

  solicitar(): void {
    const cedula = this.cedula.trim();
    if (cedula.length < 5) {
      this.errorSolicitud = 'portal.request.invalid';
      return;
    }
    this.enviando = true;
    this.errorSolicitud = '';
    this.portal.solicitar(cedula).subscribe({
      next: () => {
        this.enviando = false;
        this.cedula = '';
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.enviando = false;
        this.errorSolicitud = err?.error?.message || 'portal.request.error';
        this.cdr.detectChanges();
      },
    });
  }

  // ── Cálculos del resumen ──────────────────────────────────────────────────

  /** Jornales del mes en curso. */
  get jornalesDelMes(): MiJornal[] {
    const hoy = new Date();
    const prefijo = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
    return this.jornales.filter((j) => j.fecha?.startsWith(prefijo));
  }

  get valorDelMes(): number {
    return this.jornalesDelMes.reduce((suma, j) => suma + (j.valor ?? 0), 0);
  }

  /** Nóminas que todavía no le han pagado. */
  get porCobrar(): MiNomina[] {
    return this.nominas.filter((n) => n.estado === 'PENDIENTE' || n.estado === 'APROBADA');
  }

  get valorPorCobrar(): number {
    return this.porCobrar.reduce((suma, n) => suma + (n.valorTotal ?? 0), 0);
  }

  get ultimoPago(): MiPago | null {
    return this.pagos[0] ?? null;
  }

  datos(e: EstadoPortal) {
    return e.trabajador!;
  }

  num(v: number | null | undefined): string {
    return formatoNumero(v, this.lang.current());
  }

  pesos(v: number | null | undefined): string {
    return formatoPesos(v, this.lang.current());
  }

  fecha(v: string | null | undefined): string {
    return formatoFecha(v, this.lang.current());
  }
}
