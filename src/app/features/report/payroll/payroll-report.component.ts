import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { ReportService, PayrollReport } from '../../../core/services/report.service';
import { LanguageService } from '../../../core/services/language.service';

@Component({
  selector: 'app-payroll-report',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './payroll-report.component.html',
  styleUrl: './payroll-report.component.css'
})
export class PayrollReportComponent implements OnInit {

  private reportService = inject(ReportService);
  private cdr = inject(ChangeDetectorRef);
  private lang = inject(LanguageService);

  report: PayrollReport | null = null;
  loading = false;
  downloading = false;
  error = false;

  ngOnInit(): void {
    this.loadPreview();
  }

  loadPreview(): void {
    this.loading = true;
    this.error = false;
    this.reportService.getPayrollPreview().subscribe({
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
    this.reportService.downloadPayrollPdf().subscribe({
      next: (blob: Blob) => {
        this.triggerDownload(blob, 'payroll-report.pdf');
        this.downloading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.downloading = false;
        this.cdr.detectChanges();
      }
    });
  }

  calcularDias(inicio: string, fin: string): number {
    const a = new Date(inicio);
    const b = new Date(fin);
    return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)) + 1;
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

  // Las fechas "yyyy-MM-dd" se leen como fecha local (evita que se corra un día por zona horaria)
  private toDate(v: string): Date {
    return /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(v + 'T00:00:00') : new Date(v);
  }

  fmtNum(v: number): string {
    return new Intl.NumberFormat(this.lang.current(), { maximumFractionDigits: 0 }).format(v);
  }

  fmtDate(v: string, withYear = true): string {
    return new Intl.DateTimeFormat(this.lang.current(), {
      day: 'numeric', month: 'short', ...(withYear ? { year: 'numeric' } : {}),
    }).format(this.toDate(v));
  }

  fmtDateTime(v: string): string {
    return new Intl.DateTimeFormat(this.lang.current(), {
      day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
    }).format(this.toDate(v));
  }

  get totalJornales(): number {
    return this.report?.workerDetails.reduce((s, w) => s + w.totalJornales, 0) ?? 0;
  }

  get promedioPago(): number {
    if (!this.report || !this.report.workerDetails.length) return 0;
    return this.report.totalAccumulated / this.report.workerDetails.length;
  }

  get maxPago(): number {
    return Math.max(...(this.report?.workerDetails.map(w => w.totalPaid) ?? [1]));
  }
}
