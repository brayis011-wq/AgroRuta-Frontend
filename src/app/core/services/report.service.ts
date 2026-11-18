import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface WorkerPayrollDetail {
  workerId: number;
  workerName: string;
  /** Primera letra del nombre y del apellido, igual que en la lista del equipo */
  workerInitials?: string | null;
  totalPagos: number;
  totalPaid: number;
  periodoInicio: string;
  periodoFin: string;
  totalJornales: number;
}

export interface MonthlyPayment {
  /** "2026-11" */
  mes: string;
  total: number;
  pagos: number;
}

export interface PayrollReport {
  generatedAt: string;
  totalAccumulated: number;
  workerDetails: WorkerPayrollDetail[];
  /** Últimos 6 meses, del más antiguo al más reciente */
  pagosPorMes?: MonthlyPayment[];
  totalPendiente?: number;
  nominasPendientes?: number;
}

export interface CropDetail {
  siembraId: number;
  variedad: string;
  estado: string;
  fechaSiembra: string;
  diasDesdeSiembra: number;
  totalKgCosechado: number | null;
  totalCosechas: number;
  cultivo?: string | null;
  loteNombre?: string | null;
  fincaNombre?: string | null;
  /** La siembra, su lote o su finca se eliminaron: ya no se ve en la app, pero su historial sigue aquí */
  eliminada?: boolean;
  /** Para comparar temporadas del mismo lote */
  loteId?: number | null;
  loteAreaHa?: number | null;
  /** null o ausente: la temporada sigue en curso */
  fechaFin?: string | null;
}

/** Partes que puede llevar el PDF completo */
export type ParteReporte = 'payroll' | 'crops' | 'costs' | 'profitability';
export const PARTES_REPORTE: ParteReporte[] = ['payroll', 'crops', 'costs', 'profitability'];

export interface CropReport {
  generatedAt: string;
  cropDetails: CropDetail[];
}

@Injectable({ providedIn: 'root' })
export class ReportService {

  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  getPayrollPreview(): Observable<PayrollReport> {
    return this.http.get<PayrollReport>(`${this.apiUrl}/api/reports/payroll/preview`);
  }

  getCropPreview(): Observable<CropReport> {
    return this.http.get<CropReport>(`${this.apiUrl}/api/reports/crops/preview`);
  }

  downloadPayrollPdf(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/api/reports/payroll`, { responseType: 'blob' });
  }

  downloadCropPdf(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/api/reports/crops`, { responseType: 'blob' });
  }

  downloadCostsPdf(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/api/reports/costs`, { responseType: 'blob' });
  }

  downloadProfitabilityPdf(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/api/reports/profitability`, { responseType: 'blob' });
  }

  /** Las partes elegidas en un solo PDF (sin partes, el backend pone las cuatro) */
  downloadFullPdf(partes: ParteReporte[]): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/api/reports/full`, {
      responseType: 'blob',
      params: partes.length ? { sections: partes.join(',') } : {},
    });
  }
}
