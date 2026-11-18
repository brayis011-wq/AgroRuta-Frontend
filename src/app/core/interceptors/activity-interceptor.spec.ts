import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActividadRedService, ESPERA_LENTA_MS, actividadInterceptor } from './activity-interceptor';
import { environment } from '../../../environments/environment';

describe('actividadInterceptor', () => {
  let http: HttpClient;
  let ctrl: HttpTestingController;
  let red: ActividadRedService;
  const api = (ruta: string) => `${environment.apiUrl}${ruta}`;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([actividadInterceptor])), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpClient);
    ctrl = TestBed.inject(HttpTestingController);
    red = TestBed.inject(ActividadRedService);
  });

  afterEach(() => vi.useRealTimers());

  it('cuenta la llamada mientras espera respuesta', () => {
    http.get(api('/api/farms/1')).subscribe();
    expect(red.pendientes()).toBe(1);
    ctrl.expectOne(api('/api/farms/1')).flush({});
    expect(red.pendientes()).toBe(0);
  });

  it('una llamada que tarda más de la cuenta se marca lenta, y deja de estarlo al responder', () => {
    http.get(api('/api/farms/1')).subscribe();
    vi.advanceTimersByTime(ESPERA_LENTA_MS - 1);
    expect(red.lentas()).toBe(0);
    vi.advanceTimersByTime(1);
    expect(red.lentas()).toBe(1);
    ctrl.expectOne(api('/api/farms/1')).flush({});
    expect(red.lentas()).toBe(0);
  });

  it('si responde a tiempo nunca se marca lenta', () => {
    http.get(api('/api/farms/1')).subscribe();
    ctrl.expectOne(api('/api/farms/1')).flush({});
    vi.advanceTimersByTime(ESPERA_LENTA_MS * 2);
    expect(red.lentas()).toBe(0);
  });

  it('el diagnóstico con foto y los PDF no encienden el aviso (tardan por naturaleza)', () => {
    http.post(api('/api/plantings/3/diagnoses'), {}).subscribe();
    http.get(api('/api/reports/full')).subscribe();
    vi.advanceTimersByTime(ESPERA_LENTA_MS * 3);
    expect(red.lentas()).toBe(0);
    expect(red.pendientes()).toBe(2);
  });

  it('cancelar una llamada lenta también la descuenta', () => {
    const sub = http.get(api('/api/farms/1')).subscribe();
    vi.advanceTimersByTime(ESPERA_LENTA_MS);
    expect(red.lentas()).toBe(1);
    sub.unsubscribe();
    expect(red.lentas()).toBe(0);
    expect(red.pendientes()).toBe(0);
  });
});
