// src/app/core/interceptors/jwt-interceptor.spec.ts
import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { jwtInterceptor } from './jwt-interceptor';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

/** JWT de prueba con el exp indicado (segundos desde ahora). La firma no importa en el frontend. */
function jwt(segundos: number, nombre = 'x'): string {
  const payload = btoa(JSON.stringify({ sub: nombre, exp: Math.floor(Date.now() / 1000) + segundos }));
  return `h.${payload}.s`;
}

describe('jwtInterceptor', () => {
  const api = `${environment.apiUrl}/api`;
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let auth: AuthService;
  let router: { navigate: ReturnType<typeof vi.fn> };

  /** Simula un login para tener token en memoria y la marca de sesión. */
  function iniciarSesion(token = jwt(900)) {
    auth.login({ email: 'a@x.com', password: 'p' } as any).subscribe();
    httpMock.expectOne(`${api}/auth/login`).flush({ id: 1, token, nombre: 'Ana', rol: 'Agricultor' });
  }

  beforeEach(() => {
    localStorage.clear();
    router = { navigate: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([jwtInterceptor])),
        provideHttpClientTesting(),
        { provide: Router, useValue: router },
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('pone el token y withCredentials en las llamadas a nuestra API', () => {
    const token = jwt(900);
    iniciarSesion(token);

    http.get(`${api}/farms`).subscribe();
    const req = httpMock.expectOne(`${api}/farms`);

    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
    expect(req.request.withCredentials).toBe(true);
    req.flush([]);
  });

  it('no pone token en /api/auth/*, pero sí manda la cookie', () => {
    iniciarSesion();

    http.post(`${api}/auth/refresh`, {}).subscribe();
    const req = httpMock.expectOne(`${api}/auth/refresh`);

    expect(req.request.headers.has('Authorization')).toBe(false);
    expect(req.request.withCredentials).toBe(true);
    req.flush({});
  });

  it('no toca las llamadas a servicios externos', () => {
    iniciarSesion();

    http.get('https://nominatim.openstreetmap.org/search').subscribe();
    const req = httpMock.expectOne('https://nominatim.openstreetmap.org/search');

    expect(req.request.headers.has('Authorization')).toBe(false);
    expect(req.request.withCredentials).toBe(false);
    req.flush([]);
  });

  it('con sesión pero sin token en memoria (página recargada) lo renueva antes de llamar', () => {
    localStorage.setItem('usuario', JSON.stringify({ id: 1, nombre: 'Ana' }));
    const nuevo = jwt(900, 'nuevo');

    http.get(`${api}/farms`).subscribe();
    httpMock.expectOne(`${api}/auth/refresh`).flush({ id: 1, token: nuevo, nombre: 'Ana', rol: 'Agricultor' });

    const req = httpMock.expectOne(`${api}/farms`);
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${nuevo}`);
    req.flush([]);
  });

  it('varias llamadas a la vez comparten una sola renovación', () => {
    localStorage.setItem('usuario', JSON.stringify({ id: 1 }));

    http.get(`${api}/farms`).subscribe();
    http.get(`${api}/plots/1`).subscribe();
    httpMock.expectOne(`${api}/auth/refresh`).flush({ id: 1, token: jwt(900) });

    httpMock.expectOne(`${api}/farms`).flush([]);
    httpMock.expectOne(`${api}/plots/1`).flush({});
  });

  it('si una llamada responde 401, renueva y la repite una vez', () => {
    iniciarSesion(jwt(900, 'viejo'));
    const nuevo = jwt(900, 'nuevo');
    let respuesta: unknown;

    http.get(`${api}/farms`).subscribe((r) => (respuesta = r));
    httpMock.expectOne(`${api}/farms`).flush(null, { status: 401, statusText: 'Unauthorized' });
    httpMock.expectOne(`${api}/auth/refresh`).flush({ id: 1, token: nuevo });

    const repetida = httpMock.expectOne(`${api}/farms`);
    expect(repetida.request.headers.get('Authorization')).toBe(`Bearer ${nuevo}`);
    repetida.flush(['ok']);
    expect(respuesta).toEqual(['ok']);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('si la renovación responde 401, cierra la sesión y va al login con sesion=expirada', () => {
    localStorage.setItem('usuario', JSON.stringify({ id: 1 }));
    let error: any;

    http.get(`${api}/farms`).subscribe({ error: (e) => (error = e) });
    httpMock.expectOne(`${api}/auth/refresh`).flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(error.status).toBe(401);
    expect(auth.isLoggedIn()).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/auth/login'], { queryParams: { sesion: 'expirada' } });
  });

  it('un error de red al renovar no cierra la sesión', () => {
    localStorage.setItem('usuario', JSON.stringify({ id: 1 }));
    let error: any;

    http.get(`${api}/farms`).subscribe({ error: (e) => (error = e) });
    httpMock.expectOne(`${api}/auth/refresh`).error(new ProgressEvent('error'));

    expect(error.status).toBe(0);
    expect(auth.isLoggedIn()).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('un 403 no cierra la sesión', () => {
    iniciarSesion();

    http.get(`${api}/admin/users`).subscribe({ error: () => undefined });
    httpMock.expectOne(`${api}/admin/users`).flush(null, { status: 403, statusText: 'Forbidden' });

    expect(auth.isLoggedIn()).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
