// src/app/core/services/report.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ReportService, PayrollReport, CropReport } from './report.service';
import { environment } from '../../../environments/environment';

describe('ReportService', () => {
  let service: ReportService;
  let httpMock: HttpTestingController;

  const api = environment.apiUrl;

  const mockPayrollReport: PayrollReport = {
    generatedAt: '2024-01-01',
    totalAccumulated: 5000,
    workerDetails: [
      {
        workerId: 1,
        workerName: 'Carlos',
        totalPagos: 2,
        totalPaid: 2500,
        periodoInicio: '2024-01-01',
        periodoFin: '2024-01-31',
        totalJornales: 10,
      },
    ],
  };

  const mockCropReport: CropReport = {
    generatedAt: '2024-01-01',
    cropDetails: [
      {
        siembraId: 1,
        variedad: 'Maíz',
        estado: 'cosechado',
        fechaSiembra: '2023-06-01',
        diasDesdeSiembra: 180,
        totalKgCosechado: 500,
        totalCosechas: 2,
      },
    ],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ReportService,
      ],
    });
    service = TestBed.inject(ReportService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getPayrollPreview() should GET payroll report', () => {
    service.getPayrollPreview().subscribe(r => expect(r).toEqual(mockPayrollReport));
    const req = httpMock.expectOne(`${api}/api/reports/payroll/preview`);
    expect(req.request.method).toBe('GET');
    req.flush(mockPayrollReport);
  });

  it('getCropPreview() should GET crop report', () => {
    service.getCropPreview().subscribe(r => expect(r).toEqual(mockCropReport));
    const req = httpMock.expectOne(`${api}/api/reports/crops/preview`);
    expect(req.request.method).toBe('GET');
    req.flush(mockCropReport);
  });

  it('downloadPayrollPdf() should GET payroll as blob', () => {
    const mockBlob = new Blob(['pdf content'], { type: 'application/pdf' });
    service.downloadPayrollPdf().subscribe(r => {
      expect(r).toBeInstanceOf(Blob);
      expect(r.type).toBe('application/pdf');
    });
    const req = httpMock.expectOne(`${api}/api/reports/payroll`);
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('blob');
    req.flush(mockBlob);
  });

  it('downloadCropPdf() should GET crops as blob', () => {
    const mockBlob = new Blob(['pdf content'], { type: 'application/pdf' });
    service.downloadCropPdf().subscribe(r => {
      expect(r).toBeInstanceOf(Blob);
      expect(r.type).toBe('application/pdf');
    });
    const req = httpMock.expectOne(`${api}/api/reports/crops`);
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('blob');
    req.flush(mockBlob);
  });
});
