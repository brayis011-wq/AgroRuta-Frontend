import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { vi } from 'vitest';
import { ReportHomeComponent } from './report-home.component';

describe('ReportHomeComponent', () => {
  let query: BehaviorSubject<any>;
  let router: { navigate: ReturnType<typeof vi.fn> };

  function crear(tab?: string) {
    query = new BehaviorSubject(convertToParamMap(tab ? { tab } : {}));
    router = { navigate: vi.fn() };
    TestBed.overrideComponent(ReportHomeComponent, { set: { imports: [], template: '' } });
    TestBed.configureTestingModule({
      imports: [ReportHomeComponent],
      providers: [
        { provide: ActivatedRoute, useValue: { queryParamMap: query.asObservable() } },
        { provide: Router, useValue: router },
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
    expect(router.navigate).toHaveBeenCalledWith([], expect.objectContaining({ queryParams: { tab: 'payroll' }, replaceUrl: true }));
  });

  it('follows the URL when the side menu changes the tab', () => {
    const c = crear('payroll');
    query.next(convertToParamMap({ tab: 'crops' }));
    expect(c.activeTab).toBe('crops');
  });
});
