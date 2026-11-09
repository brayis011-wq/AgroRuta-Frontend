// src/app/core/services/auth.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';
import { AuthResponse, LoginRequest, RegisterRequest } from '../models/auth.model';
import { environment } from '../../../environments/environment';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  const apiUrl = `${environment.apiUrl}/api/auth`;

  const mockAuthResponse: AuthResponse = {
    id: 1,
    nombre: 'Juan',
    email: 'juan@test.com',
    token: 'fake-jwt-token',
    rol: 'Agricultor',
  } as any;

  const mockLoginRequest: LoginRequest = {
    email: 'juan@test.com',
    password: '123456',
  } as any;

  const mockRegisterRequest: RegisterRequest = {
    nombre: 'Juan',
    email: 'juan@test.com',
    password: '123456',
    rol: 'Agricultor',
  } as any;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AuthService,
      ],
    });
    service  = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

    it('isLoggedIn() should return false when the token is expired', () => {
      const haceUnMinuto = Math.floor(Date.now() / 1000) - 60;
      localStorage.setItem('token', jwtConExp(haceUnMinuto));
      expect(service.isLoggedIn()).toBe(false);
    });

    it('isLoggedIn() should return true when the token has not expired', () => {
      const enUnaHora = Math.floor(Date.now() / 1000) + 3600;
      localStorage.setItem('token', jwtConExp(enUnaHora));
      expect(service.isLoggedIn()).toBe(true);
    });

    it('isLoggedIn() should return true when the token has no readable exp', () => {
      localStorage.setItem('token', 'no.es.unjwt');
      expect(service.isLoggedIn()).toBe(true);
    });
  // ── registro ────────────────────────────────────────────
  it('registro() should POST and return AuthResponse', () => {
    service.registro(mockRegisterRequest).subscribe(r => {
      expect(r).toEqual(mockAuthResponse);
    });
    const req = httpMock.expectOne(`${apiUrl}/register`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(mockRegisterRequest);
    req.flush(mockAuthResponse);
  });

  // ── login ───────────────────────────────────────────────
  it('login() should POST and return AuthResponse', () => {
    service.login(mockLoginRequest).subscribe(r => {
      expect(r).toEqual(mockAuthResponse);
    });
    const req = httpMock.expectOne(`${apiUrl}/login`);
    expect(req.request.method).toBe('POST');
    req.flush(mockAuthResponse);
  });

  it('login() should store token in localStorage', () => {
    service.login(mockLoginRequest).subscribe();
    const req = httpMock.expectOne(`${apiUrl}/login`);
    req.flush(mockAuthResponse);
    expect(localStorage.getItem('token')).toBe('fake-jwt-token');
  });

  it('login() should store usuario in localStorage', () => {
    service.login(mockLoginRequest).subscribe();
    const req = httpMock.expectOne(`${apiUrl}/login`);
    req.flush(mockAuthResponse);
    expect(localStorage.getItem('usuario')).toBe(JSON.stringify(mockAuthResponse));
  });

  // ── logout ──────────────────────────────────────────────
  it('login() should discard an old session token before calling the API', () => {
    localStorage.setItem('token', 'old-expired-token');
    localStorage.setItem('usuario', '{"id":9}');
    service.login(mockLoginRequest).subscribe({ error: () => {} });
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('usuario')).toBeNull();
    const req = httpMock.expectOne(`${apiUrl}/login`);
    req.flush({ message: 'Credenciales inválidas' }, { status: 401, statusText: 'Unauthorized' });
  });

  it('logout() should remove token and usuario from localStorage', () => {
    localStorage.setItem('token', 'fake-jwt-token');
    localStorage.setItem('usuario', JSON.stringify(mockAuthResponse));
    service.logout();
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('usuario')).toBeNull();
  });

  // ── getToken ────────────────────────────────────────────
  it('getToken() should return token when it exists', () => {
    localStorage.setItem('token', 'fake-jwt-token');
    expect(service.getToken()).toBe('fake-jwt-token');
  });

  it('getToken() should return null when no token', () => {
    expect(service.getToken()).toBeNull();
  });

  // ── isLoggedIn ──────────────────────────────────────────
  it('isLoggedIn() should return true when token exists', () => {
    localStorage.setItem('token', 'fake-jwt-token');
    expect(service.isLoggedIn()).toBe(true);
  });

  it('isLoggedIn() should return false when no token', () => {
    expect(service.isLoggedIn()).toBe(false);
  });
    // Construye un JWT de prueba (sin firma real) con el exp indicado, en segundos
    const jwtConExp = (expSegundos: number): string => {
      const b64 = (o: object) =>
        btoa(JSON.stringify(o)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
      return `${b64({ alg: 'HS256' })}.${b64({ exp: expSegundos })}.firma`;
    };
  // ── getUsuario ──────────────────────────────────────────
  it('getUsuario() should return parsed usuario from localStorage', () => {
    localStorage.setItem('usuario', JSON.stringify(mockAuthResponse));
    expect(service.getUsuario()).toEqual(mockAuthResponse);
  });

  it('getUsuario() should return null when no usuario in localStorage', () => {
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
    expect(localStorage.getItem('token')).toBe(mockAuthResponse.token);
  });

  it('reenviarVerificacion() should POST the email', () => {
    service.reenviarVerificacion('ana@x.com').subscribe();
    const req = httpMock.expectOne(`${apiUrl}/resend-verification`);
    expect(req.request.body).toEqual({ email: 'ana@x.com' });
    req.flush({ mensaje: 'ok' });
  });
});
