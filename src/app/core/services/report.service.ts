import { Injectable, inject, signal } from '@angular/core';
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

/** Periodos que se pueden elegir en Reportes */
export type ClavePeriodo = 'todo' | 'mes' | 'anio' | 'anioPasado' | 'doce';
export const CLAVES_PERIODO: ClavePeriodo[] = ['todo', 'mes', 'anio', 'anioPasado', 'doce'];

const isoLocal = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Fechas (aaaa-mm-dd, las dos incluidas) de cada periodo; null = sin límite */
export function rangoPeriodo(clave: ClavePeriodo, hoy = new Date()): { desde: string | null; hasta: string | null } {
  const y = hoy.getFullYear();
  switch (clave) {
    case 'mes': return { desde: isoLocal(new Date(y, hoy.getMonth(), 1)), hasta: isoLocal(new Date(y, hoy.getMonth() + 1, 0)) };
    case 'anio': return { desde: `${y}-01-01`, hasta: `${y}-12-31` };
    case 'anioPasado': return { desde: `${y - 1}-01-01`, hasta: `${y - 1}-12-31` };
    case 'doce': return { desde: isoLocal(new Date(y, hoy.getMonth() - 11, 1)), hasta: isoLocal(hoy) };
    default: return { desde: null, hasta: null };
  }
}

@Injectable({ providedIn: 'root' })
export class ReportService {

  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  /** Periodo elegido en Reportes: lo usan la vista previa, los PDF y el PDF con todo */
  readonly periodo = signal<ClavePeriodo>('todo');

  private params(extra: Record<string, string> = {}): Record<string, string> {
    const { desde, hasta } = rangoPeriodo(this.periodo());
    return { ...extra, ...(desde ? { desde } : {}), ...(hasta ? { hasta } : {}) };
  }

  getPayrollPreview(): Observable<PayrollReport> {
    return this.http.get<PayrollReport>(`${this.apiUrl}/api/reports/payroll/preview`, { params: this.params() });
  }

  getCropPreview(): Observable<CropReport> {
    return this.http.get<CropReport>(`${this.apiUrl}/api/reports/crops/preview`, { params: this.params() });
  }

  downloadPayrollPdf(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/api/reports/payroll`, { responseType: 'blob', params: this.params() });
  }

  downloadCropPdf(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/api/reports/crops`, { responseType: 'blob', params: this.params() });
  }

  downloadCostsPdf(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/api/reports/costs`, { responseType: 'blob', params: this.params() });
  }

  downloadProfitabilityPdf(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/api/reports/profitability`, { responseType: 'blob', params: this.params() });
  }

  /** Las partes elegidas en un solo PDF (sin partes, el backend pone las cuatro) */
  downloadFullPdf(partes: ParteReporte[]): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/api/reports/full`, {
      responseType: 'blob',
      params: this.params(partes.length ? { sections: partes.join(',') } : {}),
    });
  }
}
