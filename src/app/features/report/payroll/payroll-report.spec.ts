import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { PayrollReportComponent } from './payroll-report';
import { ReportService } from '../../../core/services/report.service';

describe('PayrollReportComponent', () => {
  let svc: any;
  const crear = () => {
    TestBed.overrideComponent(PayrollReportComponent, { set: { template: '' } });
    TestBed.configureTestingModule({ imports: [PayrollReportComponent], providers: [{ provide: ReportService, useValue: svc }] });
    const c = TestBed.createComponent(PayrollReportComponent).componentInstance;
    c.ngOnInit();
    return c;
  };
  beforeEach(() => {
    svc = {
      getPayrollPreview: vi.fn(() => of({ generatedAt: '2026-11-04T10:00:00', totalAccumulated: 900,
        workerDetails: [{ workerId: 1, workerName: 'Ana', totalPaid: 300 }, { workerId: 2, workerName: 'Luis', totalPaid: 600 }],
        pagosPorMes: [{ mes: '2026-10', total: 300, pagos: 1 }, { mes: '2026-11', total: 600, pagos: 1 }] })),
      downloadPayrollPdf: vi.fn(() => of(new Blob(['%PDF']))),
    };
  });

  it('loads and sorts the highest paid first', () => {
    const c = crear();
    expect(c.loading()).toBe(false);
    expect(c.filas().map((f) => f.workerName)).toEqual(['Luis', 'Ana']);
    expect(c.variacion()).toBe(100);
  });

  it('shows an error state when loading fails', () => {
    svc.getPayrollPreview = vi.fn(() => throwError(() => new Error()));
    const c = crear();
    expect(c.error()).toBe(true);
  });

  it('downloads the PDF with a Spanish file name', () => {
    const c = crear();
    const spy = vi.spyOn(c as any, 'descargar').mockImplementation(() => {});
    c.descargarPdf();
    expect(spy).toHaveBeenCalledWith(expect.any(Blob), 'reporte-nomina.pdf');
    expect(c.downloading()).toBe(false);
  });

  it('flags a failed download', () => {
    svc.downloadPayrollPdf = vi.fn(() => throwError(() => new Error()));
    const c = crear();
    c.descargarPdf();
    expect(c.downloadError()).toBe(true);
  });
});
