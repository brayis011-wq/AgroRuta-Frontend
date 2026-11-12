import { TestBed } from '@angular/core/testing';
import { HttpClient, HttpContext, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { environment } from '../../../environments/environment';
import { SIN_CACHE, VIDA_CACHE_MS, cacheBreveInterceptor, vaciarCacheBreve } from './cache-interceptor';

const API = `${environment.apiUrl}/api`;
const sesion = (token = 'uno') => ({ headers: { Authorization: `Bearer ${token}` } });

describe('cacheBreveInterceptor', () => {
  let http: HttpClient;
  let servidor: HttpTestingController;

  beforeEach(() => {
    vaciarCacheBreve();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([cacheBreveInterceptor])), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpClient);
    servidor = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    servidor.verify();
    vi.useRealTimers();
  });

  it('responde la segunda consulta con lo que ya se trajo', () => {
    const vistos: unknown[] = [];
    http.get(`${API}/farms`, sesion()).subscribe((r) => vistos.push(r));
    servidor.expectOne(`${API}/farms`).flush([{ id: 1 }]);

    http.get(`${API}/farms`, sesion()).subscribe((r) => vistos.push(r));
    servidor.expectNone(`${API}/farms`);

    expect(vistos).toEqual([[{ id: 1 }], [{ id: 1 }]]);
  });

  it('cada pantalla recibe su propia copia', () => {
    let primera: { id: number }[] = [];
    http.get<{ id: number }[]>(`${API}/farms`, sesion()).subscribe((r) => (primera = r));
    servidor.expectOne(`${API}/farms`).flush([{ id: 2 }, { id: 1 }]);
    primera.sort((a, b) => a.id - b.id).push({ id: 99 });

    let segunda: { id: number }[] = [];
    http.get<{ id: number }[]>(`${API}/farms`, sesion()).subscribe((r) => (segunda = r));
    expect(segunda).toEqual([{ id: 2 }, { id: 1 }]);
  });

  it('dos consultas iguales a la vez comparten una sola llamada', () => {
    const vistos: unknown[] = [];
    http.get(`${API}/lots`, sesion()).subscribe((r) => vistos.push(r));
    http.get(`${API}/lots`, sesion()).subscribe((r) => vistos.push(r));
    servidor.expectOne(`${API}/lots`).flush(['a']);
    expect(vistos).toEqual([['a'], ['a']]);
  });

  it('después de guardar algo vuelve a consultar', () => {
    http.get(`${API}/farms`, sesion()).subscribe();
    servidor.expectOne(`${API}/farms`).flush([]);

    http.post(`${API}/farms`, {}, sesion()).subscribe();
    servidor.expectOne(`${API}/farms`).flush({ id: 1 });

    http.get(`${API}/farms`, sesion()).subscribe();
    servidor.expectOne(`${API}/farms`).flush([{ id: 1 }]);
  });

  it('no guarda una consulta que salió antes de un cambio', () => {
    http.get(`${API}/farms`, sesion()).subscribe();
    const vieja = servidor.expectOne(`${API}/farms`);
    http.delete(`${API}/farms/1`, sesion()).subscribe();
    servidor.expectOne(`${API}/farms/1`).flush(null);
    vieja.flush([{ id: 1 }]);

    http.get(`${API}/farms`, sesion()).subscribe();
    servidor.expectOne(`${API}/farms`).flush([]);
  });

  it('la copia vence a los 20 segundos', () => {
    vi.useFakeTimers();
    http.get(`${API}/farms`, sesion()).subscribe();
    servidor.expectOne(`${API}/farms`).flush([]);

    vi.advanceTimersByTime(VIDA_CACHE_MS + 1);
    http.get(`${API}/farms`, sesion()).subscribe();
    servidor.expectOne(`${API}/farms`).flush([]);
  });

  it('no mezcla sesiones ni guarda lo que no debe', () => {
    http.get(`${API}/farms`, sesion('uno')).subscribe();
    servidor.expectOne(`${API}/farms`).flush([]);

    // Otra sesión, sin sesión, rutas excluidas, archivos, errores y consultas marcadas van siempre al servidor
    http.get(`${API}/farms`, sesion('dos')).subscribe();
    servidor.expectOne(`${API}/farms`).flush([]);

    for (let i = 0; i < 2; i++) {
      http.get(`${API}/public/receipts/1`).subscribe();
      servidor.expectOne(`${API}/public/receipts/1`).flush({});

      http.get(`${API}/configuration/security`, sesion()).subscribe();
      servidor.expectOne(`${API}/configuration/security`).flush({});

      http.get(`${API}/photos/1`, { ...sesion(), responseType: 'blob' }).subscribe();
      servidor.expectOne(`${API}/photos/1`).flush(new Blob(['x']));

      http.get(`${API}/workers`, sesion()).subscribe({ error: () => undefined });
      servidor.expectOne(`${API}/workers`).flush('falló', { status: 500, statusText: 'Error' });

      http.get(`${API}/payrolls`, { ...sesion(), context: new HttpContext().set(SIN_CACHE, true) }).subscribe();
      servidor.expectOne(`${API}/payrolls`).flush([]);
    }

    http.get('https://api.openweathermap.org/data', sesion()).subscribe();
    servidor.expectOne('https://api.openweathermap.org/data').flush({});
    http.get('https://api.openweathermap.org/data', sesion()).subscribe();
    servidor.expectOne('https://api.openweathermap.org/data').flush({});
  });
});
