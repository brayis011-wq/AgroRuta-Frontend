// src/app/core/interceptors/jwt-interceptor.spec.ts
import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpInterceptorFn } from '@angular/common/http';
import { of } from 'rxjs';
import { jwtInterceptor } from './jwt-interceptor';
import { AuthService } from '../services/auth';

describe('jwtInterceptor', () => {
  let authServiceMock: any;

  const interceptor: HttpInterceptorFn = (req, next) =>
    TestBed.runInInjectionContext(() => jwtInterceptor(req, next));

  beforeEach(() => {
    authServiceMock = {
      getToken: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceMock },
      ],
    });
  });

  afterEach(() => vi.restoreAllMocks());

  it('should add Authorization header when token exists', () => {
    return new Promise<void>((resolve) => {
      authServiceMock.getToken.mockReturnValue('fake-jwt-token');

      const req = {
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
});
