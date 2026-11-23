import { DescargasReporteComponent } from '../downloads/report-downloads';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { PayrollReport, ReportService } from '../../../core/services/report.service';
import { ReportBase } from '../report-base';
import { tablaNomina } from '../report-csv';
import { OrdenNomina, barrasMensuales, ordenarTrabajadores, participacion, resumenNomina, variacionUltimoMes } from '../report-calc';
import { iniciales as inicialesDe } from '../../../shared/iniciales';
import { EtiquetasTablaDirective } from '../../../shared/table-labels.directive';

@Component({
  selector: 'app-payroll-report',
  standalone: true,
  imports: [TranslatePipe, DescargasReporteComponent, EtiquetasTablaDirective],
  templateUrl: './payroll-report.html',
  styleUrls: ['../report-shared.css', '../report-table.css', './payroll-report.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PayrollReportComponent extends ReportBase implements OnInit {
  private readonly reportService = inject(ReportService);

  readonly report = signal<PayrollReport | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly downloading = signal(false);
  readonly downloadError = signal(false);
  readonly orden = signal<OrdenNomina>('total');
  readonly filtro = signal('');

  readonly resumen = computed(() => { const r = this.report(); return r ? resumenNomina(r) : null; });
  readonly meses = computed(() => barrasMensuales(this.report()?.pagosPorMes, this.lang.current()));
  readonly variacion = computed(() => variacionUltimoMes(this.report()?.pagosPorMes));
  readonly reparto = computed(() => participacion(
    [...(this.report()?.workerDetails ?? [])].sort((a, b) => (b.totalPaid ?? 0) - (a.totalPaid ?? 0)).slice(0, 8),
    (w) => w.workerName, (w) => w.totalPaid ?? 0));
  readonly filas = computed(() => ordenarTrabajadores(this.report()?.workerDetails ?? [], this.orden(), this.filtro()));

  ngOnInit(): void { this.cargar(); }

  cargar(): void {
    this.loading.set(true);
    this.error.set(false);
    this.reportService.getPayrollPreview().subscribe({
      next: (r) => { this.report.set(r); this.loading.set(false); },
      error: () => { this.error.set(true); this.loading.set(false); },
    });
  }

  /** Lo que se ve en pantalla (con filtros y orden) como CSV para Excel */
  descargarExcel(): void {
    this.exportarCsv('reporte-nomina', tablaNomina(this.filas(), this.t));
  }

  descargarPdf(): void {
    this.downloading.set(true);
    this.downloadError.set(false);
    this.reportService.downloadPayrollPdf().subscribe({
      next: (b) => { this.descargar(b, 'reporte-nomina.pdf'); this.downloading.set(false); },
      error: () => { this.downloading.set(false); this.downloadError.set(true); },
    });
  }

  ordenarPor(o: OrdenNomina): void { this.orden.set(o); }

  /** Respaldo si el backend aún no manda las iniciales */
  iniciales(nombre: string): string { return inicialesDe(nombre); }
}
