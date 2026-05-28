// src/app/core/interceptors/logging.interceptor.spec.ts
import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { loggingInterceptor } from './logging.interceptor';
import { LoggingService } from '../services/logging.service';

describe('loggingInterceptor', () => {
  let loggingServiceMock: any;

  const interceptor: HttpInterceptorFn = (req, next) =>
    TestBed.runInInjectionContext(() => loggingInterceptor(req, next));

  beforeEach(() => {
    loggingServiceMock = {
      debug: vi.fn(),
      info:  vi.fn(),
      error: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: LoggingService, useValue: loggingServiceMock },
      ],
    });
  });

  afterEach(() => vi.restoreAllMocks());

  it('should add X-Trace-Id header and log request', () => {
    return new Promise<void>((resolve) => {
      const req = {
        method: 'GET',
        url: '/api/test',
        clone: vi.fn().mockReturnValue({ method: 'GET', url: '/api/test' }),
      } as any;
      const next = vi.fn().mockReturnValue(of({ type: 4 }));

      interceptor(req, next).subscribe({
        next: () => {
          expect(req.clone).toHaveBeenCalledWith(
            expect.objectContaining({
              setHeaders: expect.objectContaining({ 'X-Trace-Id': expect.any(String) }),
            })
          );
          expect(loggingServiceMock.debug).toHaveBeenCalledWith(
            expect.stringContaining('GET /api/test')
          );
          expect(loggingServiceMock.info).toHaveBeenCalledWith(
            expect.stringContaining('GET /api/test')
          );
          resolve();
        },
      });
    });
  });

  it('should log error and rethrow on HTTP error', () => {
    return new Promise<void>((resolve) => {
      const req = {
        method: 'POST',
        url: '/api/fail',
        clone: vi.fn().mockReturnValue({ method: 'POST', url: '/api/fail' }),
      } as any;
      const httpError = new HttpErrorResponse({ status: 500, error: 'Server error' });
      const next = vi.fn().mockReturnValue(throwError(() => httpError));

      interceptor(req, next).subscribe({
        error: (err) => {
          expect(loggingServiceMock.error).toHaveBeenCalledWith(
            expect.stringContaining('status=500'),
            'Server error'
          );
          expect(err).toBe(httpError);
          resolve();
        },
      });
    });
  });

  it('should generate a traceId of 8 uppercase characters', () => {
    return new Promise<void>((resolve) => {
      const req = {
        method: 'GET',
        url: '/api/trace',
        clone: vi.fn().mockReturnValue({ method: 'GET', url: '/api/trace' }),
      } as any;
      const next = vi.fn().mockReturnValue(of({ type: 4 }));

      interceptor(req, next).subscribe({
        next: () => {
          const debugCall = loggingServiceMock.debug.mock.calls[0][0] as string;
          const match = debugCall.match(/\[([A-Z0-9]{8})\]/);
          expect(match).not.toBeNull();
          resolve();
        },
      });
    });
  });
});
