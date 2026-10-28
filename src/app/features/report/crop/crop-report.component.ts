import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { ReportService, CropReport } from '../../../core/services/report.service';
import { LanguageService } from '../../../core/services/language.service';

@Component({
  selector: 'app-crop-report',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './crop-report.component.html',
  styleUrl: './crop-report.component.css'
})
export class CropReportComponent implements OnInit {

  private reportService = inject(ReportService);
  private cdr = inject(ChangeDetectorRef);
  private lang = inject(LanguageService);

  report: CropReport | null = null;
  loading = false;
  downloading = false;
  error = false;

  ngOnInit(): void {
    this.loadPreview();
  }

  loadPreview(): void {
    this.loading = true;
    this.error = false;
    this.reportService.getCropPreview().subscribe({
      next: (data) => {
        this.report = data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = true;
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  downloadPdf(): void {
    this.downloading = true;
    this.reportService.downloadCropPdf().subscribe({
      next: (blob: Blob) => {
        this.triggerDownload(blob, 'crop-report.pdf');
        this.downloading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.downloading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private triggerDownload(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  // ===== Formato según idioma activo (Intl nativo) =====

  private toDate(v: string): Date {
    return /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(v + 'T00:00:00') : new Date(v);
  }

  fmtNum(v: number): string {
    return new Intl.NumberFormat(this.lang.current(), { maximumFractionDigits: 0 }).format(v);
  }

  fmtDate(v: string): string {
    return new Intl.DateTimeFormat(this.lang.current(), {
      day: 'numeric', month: 'short', year: 'numeric',
    }).format(this.toDate(v));
  }

  fmtDateTime(v: string): string {
    return new Intl.DateTimeFormat(this.lang.current(), {
      day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
    }).format(this.toDate(v));
  }

  get cultivosActivos(): number {
    return this.report?.cropDetails.filter(c => c.estado === 'ACTIVO').length ?? 0;
  }

  get totalKg(): number {
    return this.report?.cropDetails.reduce((s, c) => s + c.totalKgCosechado, 0) ?? 0;
  }

  get maxKg(): number {
    return Math.max(...(this.report?.cropDetails.map(c => c.totalKgCosechado) ?? [1]));
  }

  get promedioDias(): number {
    if (!this.report?.cropDetails.length) return 0;
    const suma = this.report.cropDetails.reduce((s, c) => s + c.diasDesdeSiembra, 0);
    return Math.round(suma / this.report.cropDetails.length);
  }
}
