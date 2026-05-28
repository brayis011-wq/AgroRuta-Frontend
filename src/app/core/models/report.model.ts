export interface WorkerPayrollDetail {
  workerId: number;
  workerName: string;
  totalPagos: number;
  totalPaid: number;
}

export interface PayrollReport {
  generatedAt: string;
  totalAccumulated: number;
  workerDetails: WorkerPayrollDetail[];
}

export interface CropDetail {
  siembraId: number;
  variedad: string;
  estado: string;
  fechaSiembra: string;
  diasDesdeSiembra: number;
  totalKgCosechado: number;
  totalCosechas: number;
}

export interface CropReport {
  generatedAt: string;
  cropDetails: CropDetail[];
}
export interface WorkerPayrollDetail {
  workerId: number;
  workerName: string;
  totalPagos: number;
  totalPaid: number;
  periodoInicio: string;
  periodoFin: string;
  totalJornales: number;
}

export interface PayrollReport {
  generatedAt: string;
  totalAccumulated: number;
  workerDetails: WorkerPayrollDetail[];
}

export interface CropDetail {
  siembraId: number;
  variedad: string;
  estado: string;
  fechaSiembra: string;
  diasDesdeSiembra: number;
  totalKgCosechado: number;
  totalCosechas: number;
}

export interface CropReport {
  generatedAt: string;
  cropDetails: CropDetail[];
}
