// src/app/core/services/auth.spec.ts
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { AuthService } from './auth';
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

  // ── registro ────────────────────────────────────────────
  it('registro() should POST and return AuthResponse', () => {
    service.registro(mockRegisterRequest).subscribe(r => {
      expect(r).toEqual(mockAuthResponse);
    });
    const req = httpMock.expectOne(`${apiUrl}/registro`);
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

  // ── getUsuario ──────────────────────────────────────────
  it('getUsuario() should return parsed usuario from localStorage', () => {
    localStorage.setItem('usuario', JSON.stringify(mockAuthResponse));
    expect(service.getUsuario()).toEqual(mockAuthResponse);
  });

  it('getUsuario() should return null when no usuario in localStorage', () => {
    expect(service.getUsuario()).toBeNull();
  });
});
