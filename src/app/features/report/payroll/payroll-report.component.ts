import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReportService, PayrollReport } from '../../../core/services/report.service';

@Component({
  selector: 'app-payroll-report',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './payroll-report.component.html',
  styleUrl: './payroll-report.component.css'
})
export class PayrollReportComponent implements OnInit {

  private reportService = inject(ReportService);
  private cdr = inject(ChangeDetectorRef);

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
