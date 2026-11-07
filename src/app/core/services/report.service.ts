import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface WorkerPayrollDetail {
  workerId: number;
  workerName: string;
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
}

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
}
