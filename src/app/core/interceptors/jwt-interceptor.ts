import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.getToken();

  const request = token
    ? req.clone({ headers: req.headers.set('Authorization', `Bearer ${token}`) })
    : req;

  return next(request).pipe(
    catchError((error: unknown) => {
      // 401 en una llamada normal = sesión inválida o vencida.
      // Los 401 de /api/auth/* son credenciales incorrectas y los maneja el login.
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        !req.url?.includes('/api/auth/')
      ) {
        authService.logout();
        router.navigate(['/auth/login'], { queryParams: { sesion: 'expirada' } });
      }
      return throwError(() => error);
    }),
  );
};
