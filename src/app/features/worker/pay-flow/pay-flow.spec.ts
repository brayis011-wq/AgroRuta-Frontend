import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { FlujoPagoComponent } from './pay-flow';

describe('FlujoPagoComponent', () => {
  it('muestra Jornales → Nóminas → Pagos con enlaces y marca el paso actual', () => {
    TestBed.configureTestingModule({ imports: [FlujoPagoComponent], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(FlujoPagoComponent);
    fixture.componentRef.setInput('actual', 'payrolls');
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect([...el.querySelectorAll('a')].map((a) => a.getAttribute('href')))
      .toEqual(['/worker/workdays', '/worker/payrolls', '/worker/payments']);
    const actual = el.querySelector('[aria-current=step]');
    expect(actual?.getAttribute('href')).toBe('/worker/payrolls');
    expect(el.querySelector('.actual-movil')?.textContent?.trim()).toBe('payFlow.payrolls.desc');
  });
});
