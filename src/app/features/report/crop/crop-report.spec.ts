import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { CropReportComponent } from './crop-report';
import { ReportService } from '../../../core/services/report.service';

describe('CropReportComponent', () => {
  const crear = () => {
    TestBed.overrideComponent(CropReportComponent, { set: { template: '' } });
    TestBed.configureTestingModule({
      imports: [CropReportComponent],
      providers: [{ provide: ReportService, useValue: {
        getCropPreview: () => of({ generatedAt: '', cropDetails: [
          { siembraId: 1, variedad: 'Uchuva · Colombia', estado: 'PRODUCCION', totalKgCosechado: 20.5, totalCosechas: 2 },
          { siembraId: 2, variedad: 'Café · Castillo', estado: 'COSECHA', totalKgCosechado: 0, totalCosechas: 0 }] }),
        downloadCropPdf: () => of(new Blob()) } }],
    });
    const c = TestBed.createComponent(CropReportComponent).componentInstance;
    c.ngOnInit();
    return c;
  };

  it('clicking a stage filters the table and a second click clears it', () => {
    const c = crear();
    c.alternarEtapa('COSECHA');
    expect(c.filas().map((f) => f.siembraId)).toEqual([2]);
    c.alternarEtapa('COSECHA');
    expect(c.filas().length).toBe(2);
  });

  it('kg keeps one decimal only when needed', () => {
    const c = crear();
    expect(c.kg(20.5)).toBe('20,5');
    expect(c.kg(1240)).toBe('1.240');
  });
});
