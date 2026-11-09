// src/app/core/services/auth.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';
import { AuthResponse, LoginRequest, RegisterRequest } from '../models/auth.model';
import { environment } from '../../../environments/environment';

/** JWT de prueba (sin firma real) con el exp indicado, en segundos desde 1970. */
const jwtConExp = (expSegundos: number): string => {
  const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${b64({ alg: 'HS256' })}.${b64({ exp: expSegundos })}.firma`;
};
const enSegundos = (s: number) => Math.floor(Date.now() / 1000) + s;

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  const apiUrl = `${environment.apiUrl}/api/auth`;

  const mockAuthResponse: AuthResponse = {
    id: 1,
    nombre: 'Juan',
    email: 'juan@test.com',
    token: jwtConExp(enSegundos(900)),
    rol: 'Agricultor',
  } as any;
  const { token: _t, ...usuarioSinToken } = mockAuthResponse as any;

  const mockLoginRequest: LoginRequest = { email: 'juan@test.com', password: '123456' } as any;
  const mockRegisterRequest: RegisterRequest = {
    nombre: 'Juan', email: 'juan@test.com', password: '123456', rol: 'Agricultor',
  } as any;

  function iniciarSesion(r: AuthResponse = mockAuthResponse) {
    service.login(mockLoginRequest).subscribe();
    httpMock.expectOne(`${apiUrl}/login`).flush(r);
  }

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), AuthService],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('borra el token que guardaban las versiones anteriores en localStorage', () => {
    localStorage.setItem('token', 'viejo');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), AuthService] });
    TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    expect(localStorage.getItem('token')).toBeNull();
  });

  // ── registro ────────────────────────────────────────────
  it('registro() hace POST y no abre sesión', () => {
    service.registro(mockRegisterRequest).subscribe((r) => expect(r).toEqual(mockAuthResponse));
    const req = httpMock.expectOne(`${apiUrl}/register`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(mockRegisterRequest);
    req.flush(mockAuthResponse);
    expect(service.isLoggedIn()).toBe(false);
  });

  // ── login ───────────────────────────────────────────────
  it('login() guarda el token solo en memoria y los datos sin token en localStorage', () => {
    iniciarSesion();
    expect(service.getToken()).toBe(mockAuthResponse.token);
    expect(localStorage.getItem('token')).toBeNull();
    expect(JSON.parse(localStorage.getItem('usuario')!)).toEqual(usuarioSinToken);
    expect(service.isLoggedIn()).toBe(true);
  });

  it('login() descarta la sesión anterior sin llamar a /logout', () => {
    localStorage.setItem('usuario', '{"id":9}');
    service.login(mockLoginRequest).subscribe({ error: () => undefined });
    expect(localStorage.getItem('usuario')).toBeNull();
    httpMock.expectNone(`${apiUrl}/logout`);
    httpMock.expectOne(`${apiUrl}/login`).flush({ message: 'Credenciales inválidas' }, { status: 401, statusText: 'Unauthorized' });
    expect(service.isLoggedIn()).toBe(false);
  });

  // ── token ───────────────────────────────────────────────
  it('getToken() devuelve null si no hay token', () => {
    expect(service.getToken()).toBeNull();
  });

  it('getToken() devuelve null si el token vence en menos de 30 s (hay que renovarlo)', () => {
    iniciarSesion({ ...mockAuthResponse, token: jwtConExp(enSegundos(10)) });
    expect(service.getToken()).toBeNull();
    expect(service.isLoggedIn()).toBe(true);
  });

  it('getToken() acepta un token sin exp legible (el servidor decide)', () => {
    iniciarSesion({ ...mockAuthResponse, token: 'no.es.unjwt' });
    expect(service.getToken()).toBe('no.es.unjwt');
  });

  // ── refrescar ───────────────────────────────────────────
  it('refrescar() pide un token nuevo con la cookie y lo guarda', () => {
    const nuevo = jwtConExp(enSegundos(900));
    let recibido: string | undefined;
    service.refrescar().subscribe((t) => (recibido = t));
    const req = httpMock.expectOne(`${apiUrl}/refresh`);
    expect(req.request.method).toBe('POST');
    req.flush({ ...mockAuthResponse, token: nuevo });
    expect(recibido).toBe(nuevo);
    expect(service.getToken()).toBe(nuevo);
  });

  it('refrescar() llamado dos veces a la vez hace una sola petición', () => {
    service.refrescar().subscribe();
    service.refrescar().subscribe();
    httpMock.expectOne(`${apiUrl}/refresh`).flush(mockAuthResponse);
    // Terminada, la siguiente vuelve a llamar
    service.refrescar().subscribe();
    httpMock.expectOne(`${apiUrl}/refresh`).flush(mockAuthResponse);
  });

  // ── logout ──────────────────────────────────────────────
  it('logout() borra la sesión local y avisa al servidor', () => {
    iniciarSesion();
    service.logout();
    expect(service.getToken()).toBeNull();
    expect(localStorage.getItem('usuario')).toBeNull();
    httpMock.expectOne(`${apiUrl}/logout`).flush(null, { status: 204, statusText: 'No Content' });
  });

  it('olvidarSesion() borra la sesión local sin llamar al servidor', () => {
    iniciarSesion();
    service.olvidarSesion();
    expect(service.isLoggedIn()).toBe(false);
    httpMock.expectNone(`${apiUrl}/logout`);
  });

  it('si otra pestaña cierra la sesión, esta suelta su token', () => {
    iniciarSesion();
    window.dispatchEvent(new StorageEvent('storage', { key: 'usuario', newValue: null }));
    expect(service.getToken()).toBeNull();
  });

  it('renovarToken() reemplaza el token en memoria (cambio de contraseña)', () => {
    iniciarSesion();
    const nuevo = jwtConExp(enSegundos(900));
    service.renovarToken(nuevo);
    expect(service.getToken()).toBe(nuevo);
  });

  // ── getUsuario ──────────────────────────────────────────
  it('getUsuario() devuelve los datos guardados', () => {
    localStorage.setItem('usuario', JSON.stringify(usuarioSinToken));
    expect(service.getUsuario()).toEqual(usuarioSinToken);
  });

  it('getUsuario() devuelve null si no hay datos o están dañados', () => {
    expect(service.getUsuario()).toBeNull();
    localStorage.setItem('usuario', '{dañado');
    expect(service.getUsuario()).toBeNull();
  });

  // ── recuperar contraseña ────────────────────────────────
  it('recuperar() should POST the email', () => {
    service.recuperar('ana@x.com').subscribe();
    const req = httpMock.expectOne(`${apiUrl}/forgot-password`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'ana@x.com' });
    req.flush({ mensaje: 'ok' });
  });

  it('restablecer() should POST token and password', () => {
    service.restablecer('tok', 'nueva-clave').subscribe();
    const req = httpMock.expectOne(`${apiUrl}/reset-password`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ token: 'tok', password: 'nueva-clave' });
    req.flush({ mensaje: 'ok' });
  });

  it('verificar() should POST the token and store the session', () => {
    service.verificar('tok').subscribe();
    const req = httpMock.expectOne(`${apiUrl}/verify`);
    expect(req.request.body).toEqual({ token: 'tok' });
    req.flush(mockAuthResponse);
    expect(service.getToken()).toBe(mockAuthResponse.token);
    expect(service.isLoggedIn()).toBe(true);
  });

  it('reenviarVerificacion() should POST the email', () => {
    service.reenviarVerificacion('ana@x.com').subscribe();
    const req = httpMock.expectOne(`${apiUrl}/resend-verification`);
    expect(req.request.body).toEqual({ email: 'ana@x.com' });
    req.flush({ mensaje: 'ok' });
  });
});
