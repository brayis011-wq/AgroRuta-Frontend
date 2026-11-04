import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { CropReport, ReportService } from '../../../core/services/report.service';
import { ReportBase } from '../report-base';
import { ETAPAS, filtrarSiembras, resumenCultivos, ubicacionDe } from '../report-calc';

@Component({
  selector: 'app-crop-report',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './crop-report.component.html',
  styleUrls: ['../report-shared.css', '../report-tabla.css', './crop-report.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CropReportComponent extends ReportBase implements OnInit {
  private readonly reportService = inject(ReportService);

  readonly etapas = ETAPAS;
  readonly ubicacion = ubicacionDe;
  readonly report = signal<CropReport | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly downloading = signal(false);
  readonly downloadError = signal(false);
  readonly etapa = signal<string | null>(null);
  readonly filtro = signal('');

  readonly resumen = computed(() => { const r = this.report(); return r ? resumenCultivos(r) : null; });
  readonly filas = computed(() => filtrarSiembras(this.report()?.cropDetails ?? [], this.etapa(), this.filtro()));

  ngOnInit(): void { this.cargar(); }

  cargar(): void {
    this.loading.set(true);
    this.error.set(false);
    this.reportService.getCropPreview().subscribe({
      next: (r) => { this.report.set(r); this.loading.set(false); },
      error: () => { this.error.set(true); this.loading.set(false); },
    });
  }

  descargarPdf(): void {
    this.downloading.set(true);
    this.downloadError.set(false);
    this.reportService.downloadCropPdf().subscribe({
      next: (b) => { this.descargar(b, 'reporte-cultivos.pdf'); this.downloading.set(false); },
      error: () => { this.downloading.set(false); this.downloadError.set(true); },
    });
  }

  /** Clic en una etapa: filtra la tabla; otro clic quita el filtro */
  alternarEtapa(e: string): void {
    this.etapa.update((actual) => (actual === e ? null : e));
  }

  kg(v: number | null | undefined): string {
    const x = v ?? 0;
    return this.numero(x, x % 1 === 0 ? 0 : 1);
  }
}
