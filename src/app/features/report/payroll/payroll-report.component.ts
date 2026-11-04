import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { PayrollReport, ReportService } from '../../../core/services/report.service';
import { ReportBase } from '../report-base';
import { OrdenNomina, barrasMensuales, ordenarTrabajadores, participacion, resumenNomina, variacionUltimoMes } from '../report-calc';

@Component({
  selector: 'app-payroll-report',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './payroll-report.component.html',
  styleUrls: ['../report-shared.css', '../report-tabla.css', './payroll-report.component.css'],
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

  descargarPdf(): void {
    this.downloading.set(true);
    this.downloadError.set(false);
    this.reportService.downloadPayrollPdf().subscribe({
      next: (b) => { this.descargar(b, 'reporte-nomina.pdf'); this.downloading.set(false); },
      error: () => { this.downloading.set(false); this.downloadError.set(true); },
    });
  }

  ordenarPor(o: OrdenNomina): void { this.orden.set(o); }
}
