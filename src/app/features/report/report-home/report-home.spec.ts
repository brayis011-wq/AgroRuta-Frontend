import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { ReportHomeComponent } from './report-home';
import { ClavePeriodo, ReportService } from '../../../core/services/report.service';
import { signal } from '@angular/core';

describe('ReportHomeComponent', () => {
  let query: BehaviorSubject<any>;
  let router: { navigate: ReturnType<typeof vi.fn> };

  let reportes: {
    downloadFullPdf: ReturnType<typeof vi.fn>;
    periodo: ReturnType<typeof signal<ClavePeriodo>>;
  };

  function crear(tab?: string) {
    query = new BehaviorSubject(convertToParamMap(tab ? { tab } : {}));
    router = { navigate: vi.fn() };
    reportes = {
      downloadFullPdf: vi.fn().mockReturnValue(of(new Blob(['%PDF']))),
      periodo: signal<ClavePeriodo>('todo'),
    };
    TestBed.overrideComponent(ReportHomeComponent, { set: { imports: [], template: '' } });
    TestBed.configureTestingModule({
      imports: [ReportHomeComponent],
      providers: [
        { provide: ActivatedRoute, useValue: { queryParamMap: query.asObservable() } },
        { provide: Router, useValue: router },
        { provide: ReportService, useValue: reportes },
      ],
    });
    return TestBed.createComponent(ReportHomeComponent).componentInstance;
  }

  it('opens the tab given in the URL', () => {
    expect(crear('crops').activeTab).toBe('crops');
  });

  it('defaults to payroll and writes it in the URL', () => {
    const c = crear();
    expect(c.activeTab).toBe('payroll');
    expect(router.navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({ queryParams: { tab: 'payroll', siembra: null }, replaceUrl: true }),
    );
  });

  it('follows the URL when the side menu changes the tab', () => {
    const c = crear('payroll');
    query.next(convertToParamMap({ tab: 'crops' }));
    expect(c.activeTab).toBe('crops');
  });

  describe('PDF with everything', () => {
    function descargas() {
      const enlaces: HTMLAnchorElement[] = [];
      vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
        this: HTMLAnchorElement,
      ) {
        enlaces.push(this);
      });
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:x');
      return enlaces;
    }

    afterEach(() => vi.restoreAllMocks());

    it('starts with the four parts ticked and downloads them in tab order', () => {
      const enlaces = descargas();
      const c = crear('costs');
      c.panelCompleto.set(true);
      c.alternarParte('crops');
      c.alternarParte('crops'); // se vuelve a marcar: queda al final del Set, pero sale en su orden

      c.descargarCompleto();

      expect(reportes.downloadFullPdf).toHaveBeenCalledWith([
        'payroll',
        'crops',
        'costs',
        'profitability',
      ]);
      expect(enlaces[0].download).toBe('reporte-agroruta.pdf');
      expect(c.panelCompleto()).toBe(false);
      expect(c.descargandoCompleto()).toBe(false);
    });

    it('sends only the ticked parts', () => {
      descargas();
      const c = crear();
      c.alternarParte('payroll');
      c.alternarParte('crops');

      c.descargarCompleto();

      expect(reportes.downloadFullPdf).toHaveBeenCalledWith(['costs', 'profitability']);
    });

    it('does nothing with no part ticked', () => {
      const c = crear();
      for (const p of c.partes) c.alternarParte(p);

      c.descargarCompleto();

      expect(c.elegidas().size).toBe(0);
      expect(reportes.downloadFullPdf).not.toHaveBeenCalled();
    });

    it('shows an error and keeps the panel open when the download fails', () => {
      const c = crear();
      reportes.downloadFullPdf.mockReturnValue(throwError(() => new Error('red')));
      c.panelCompleto.set(true);

      c.descargarCompleto();

      expect(c.errorCompleto()).toBe(true);
      expect(c.panelCompleto()).toBe(true);
      expect(c.descargandoCompleto()).toBe(false);
    });
  });
  it('lee el periodo de la URL y lo guarda al cambiarlo', () => {
    query = new BehaviorSubject(convertToParamMap({}));
    const c = crear('costs');
    query.next(convertToParamMap({ tab: 'costs', periodo: 'anio' }));
    expect(reportes.periodo()).toBe('anio');
    c.elegirPeriodo('todo');
    expect(reportes.periodo()).toBe('todo');
    expect(router.navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({ queryParams: { periodo: null }, queryParamsHandling: 'merge' }),
    );
  });
});
