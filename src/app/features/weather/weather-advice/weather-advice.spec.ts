import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { WeatherAdviceComponent } from './weather-advice';
import { WeatherService } from '../../../core/services/weather.service';

describe('WeatherAdviceComponent', () => {
  const clima = { consejos: vi.fn() };

  function crear() {
    TestBed.configureTestingModule({
      imports: [WeatherAdviceComponent],
      providers: [provideRouter([]), { provide: WeatherService, useValue: clima }],
    });
    const f = TestBed.createComponent(WeatherAdviceComponent);
    f.detectChanges();
    return f;
  }

  it('sin consejos no ocupa espacio', () => {
    clima.consejos.mockReturnValue(of([]));
    expect(crear().nativeElement.querySelector('.consejos')).toBeNull();
  });

  it('muestra cada consejo con su lote y su nivel', () => {
    clima.consejos.mockReturnValue(of([{ tipo: 'NO_FUMIGAR', nivel: 'ALERTA', fincaId: 1, finca: 'La Esperanza', lote: 'Lote El Mango',
      cultivo: 'Café', dia: '2026-11-10', motivo: 'LLUVIA', problemaDesde: null, ventanaInicio: null, ventanaFin: null, valor: null }]));
    const el: HTMLElement = crear().nativeElement;
    expect(el.querySelectorAll('li.alerta').length).toBe(1);
    expect(el.textContent).toContain('Lote El Mango · La Esperanza');
  });

  it('si el servidor falla, no muestra nada', () => {
    clima.consejos.mockReturnValue(throwError(() => new Error('sin señal')));
    expect(crear().nativeElement.querySelector('.consejos')).toBeNull();
  });
});
