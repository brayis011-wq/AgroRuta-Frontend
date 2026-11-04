// src/app/core/interceptors/jwt-interceptor.spec.ts
import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { jwtInterceptor } from './jwt-interceptor';
import { AuthService } from '../services/auth';

describe('jwtInterceptor', () => {
  let authServiceMock: any;
  let routerMock: any;

  const interceptor: HttpInterceptorFn = (req, next) =>
    TestBed.runInInjectionContext(() => jwtInterceptor(req, next));

  beforeEach(() => {
    authServiceMock = {
      getToken: vi.fn(),
      logout: vi.fn(),
    };
    routerMock = {
      navigate: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock },
      ],
    });
  });

  afterEach(() => vi.restoreAllMocks());

  it('should add Authorization header when token exists', () => {
    return new Promise<void>((resolve) => {
      authServiceMock.getToken.mockReturnValue('fake-jwt-token');

      const req = {
        url: 'http://localhost:8080/api/test',
        headers: {
          set: vi.fn().mockReturnValue('headers-with-auth'),
        },
        clone: vi.fn().mockReturnValue({ url: '/api/test', withAuth: true }),
      } as any;

      const next = vi.fn().mockReturnValue(of({ type: 4 }));

      interceptor(req, next).subscribe({
        next: () => {
          expect(req.headers.set).toHaveBeenCalledWith(
            'Authorization',
            'Bearer fake-jwt-token'
          );
          expect(req.clone).toHaveBeenCalledWith({
            headers: 'headers-with-auth',
          });
          expect(next).toHaveBeenCalledWith({ url: '/api/test', withAuth: true });
          resolve();
        },
      });
    });
  });

  it('should NOT send the token to external services', () => {
    return new Promise<void>((resolve) => {
      authServiceMock.getToken.mockReturnValue('fake-jwt-token');

      const req = {
        url: 'https://nominatim.openstreetmap.org/search?q=Tunja',
        headers: { set: vi.fn() },
        clone: vi.fn(),
      } as any;

      const next = vi.fn().mockReturnValue(of({ type: 4 }));

      interceptor(req, next).subscribe({
        next: () => {
          expect(req.clone).not.toHaveBeenCalled();
          expect(next).toHaveBeenCalledWith(req);
          resolve();
        },
      });
    });
  });

  it('should NOT add Authorization header when no token', () => {
    return new Promise<void>((resolve) => {
      authServiceMock.getToken.mockReturnValue(null);

      const req = {
        headers: { set: vi.fn() },
        clone: vi.fn(),
      } as any;

      const next = vi.fn().mockReturnValue(of({ type: 4 }));

      interceptor(req, next).subscribe({
        next: () => {
          expect(req.clone).not.toHaveBeenCalled();
          expect(next).toHaveBeenCalledWith(req);
          resolve();
        },
      });
    });
  });

  it('should pass request unchanged when token is empty string', () => {
    return new Promise<void>((resolve) => {
      authServiceMock.getToken.mockReturnValue('');

      const req = {
        headers: { set: vi.fn() },
        clone: vi.fn(),
      } as any;

      const next = vi.fn().mockReturnValue(of({ type: 4 }));

      interceptor(req, next).subscribe({
        next: () => {
          expect(req.clone).not.toHaveBeenCalled();
          expect(next).toHaveBeenCalledWith(req);
          resolve();
        },
      });
    });
  });

  // ── manejo de errores HTTP ────────────────────────────────────────────

  const requestFalso = (url: string) =>
    ({
      url,
      headers: { set: vi.fn().mockReturnValue('headers') },
      clone: vi.fn().mockReturnValue({ url }),
    }) as any;

  const respuestaConError = (status: number, url: string) =>
    vi.fn().mockReturnValue(throwError(() => new HttpErrorResponse({ status, url })));

  it('on 401 should logout and redirect to login with sesion=expirada', () => {
    return new Promise<void>((resolve) => {
      authServiceMock.getToken.mockReturnValue('tok');
      const req = requestFalso('/api/fincas/1');
      const next = respuestaConError(401, '/api/fincas/1');

      interceptor(req, next).subscribe({
        error: (err) => {
          expect(err.status).toBe(401);
          expect(authServiceMock.logout).toHaveBeenCalledTimes(1);
          expect(routerMock.navigate).toHaveBeenCalledWith(['/auth/login'], {
            queryParams: { sesion: 'expirada' },
          });
          resolve();
        },
      });
    });
  });

  it('on 401 from /api/auth/login should NOT logout nor redirect', () => {
    return new Promise<void>((resolve) => {
      authServiceMock.getToken.mockReturnValue(null);
      const req = requestFalso('http://localhost:8080/api/auth/login');
      const next = respuestaConError(401, '/api/auth/login');

      interceptor(req, next).subscribe({
        error: (err) => {
          expect(err.status).toBe(401);
          expect(authServiceMock.logout).not.toHaveBeenCalled();
          expect(routerMock.navigate).not.toHaveBeenCalled();
          resolve();
        },
      });
    });
  });

  it('on 403 should propagate the error without closing the session', () => {
    return new Promise<void>((resolve) => {
      authServiceMock.getToken.mockReturnValue('tok');
      const req = requestFalso('/api/fincas/2');
      const next = respuestaConError(403, '/api/fincas/2');

      interceptor(req, next).subscribe({
        error: (err) => {
          expect(err.status).toBe(403);
          expect(authServiceMock.logout).not.toHaveBeenCalled();
          expect(routerMock.navigate).not.toHaveBeenCalled();
          resolve();
        },
      });
    });
  });

  it('on 500 should propagate the error without closing the session', () => {
    return new Promise<void>((resolve) => {
      authServiceMock.getToken.mockReturnValue('tok');
      const req = requestFalso('/api/fincas');
      const next = respuestaConError(500, '/api/fincas');

      interceptor(req, next).subscribe({
        error: (err) => {
          expect(err.status).toBe(500);
          expect(authServiceMock.logout).not.toHaveBeenCalled();
          expect(routerMock.navigate).not.toHaveBeenCalled();
          resolve();
        },
      });
    });
  });

  it('should NOT add Authorization header to /api/auth/login even with an old token', () => {
    return new Promise<void>((resolve) => {
      authServiceMock.getToken.mockReturnValue('expired-jwt-token');

      const req = {
        url: 'http://localhost:8080/api/auth/login',
        headers: { set: vi.fn() },
        clone: vi.fn(),
      } as any;

      const next = vi.fn().mockReturnValue(of({ type: 4 }));

      interceptor(req, next).subscribe({
        next: () => {
          expect(req.clone).not.toHaveBeenCalled();
          expect(req.headers.set).not.toHaveBeenCalled();
          expect(next).toHaveBeenCalledWith(req);
          resolve();
        },
      });
    });
  });

  it('should NOT add Authorization header to /api/auth/registro', () => {
    return new Promise<void>((resolve) => {
      authServiceMock.getToken.mockReturnValue('expired-jwt-token');

      const req = {
        url: 'http://localhost:8080/api/auth/registro',
        headers: { set: vi.fn() },
        clone: vi.fn(),
      } as any;

      const next = vi.fn().mockReturnValue(of({ type: 4 }));

      interceptor(req, next).subscribe({
        next: () => {
          expect(req.clone).not.toHaveBeenCalled();
          expect(next).toHaveBeenCalledWith(req);
          resolve();
        },
      });
    });
  });
});
