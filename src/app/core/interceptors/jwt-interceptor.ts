import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, of, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { esNuestraApi } from './api-url';

const es401 = (e: unknown) => e instanceof HttpErrorResponse && e.status === 401;

/**
 * Pone el token de acceso en las llamadas a nuestro backend y lo renueva cuando hace falta:
 * - Sin token en memoria (página recién abierta o token vencido) pero con sesión → lo pide a /refresh.
 * - Si una llamada responde 401 (venció en el camino o cambió la contraseña) → renueva y reintenta una vez.
 * - Si la renovación también responde 401, la sesión terminó: va al login.
 * Un error de red al renovar (sin señal, backend despertando) no cierra la sesión.
 */
export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  // El token solo viaja a nuestro backend, nunca a servicios externos (mapas, clima, etc.)
  if (!esNuestraApi(req.url)) return next(req);

  const authService = inject(AuthService);
  const router = inject(Router);

  // withCredentials: en local la API está en otro puerto y sin esto el navegador ignora la cookie de sesión
  const base = req.clone({ withCredentials: true });

  // Login, registro, renovación y recuperación no llevan token: uno vencido haría fallar el login.
  // Sus 401 son credenciales incorrectas y los maneja cada pantalla.
  if (req.url.includes('/api/auth/')) return next(base);

  const conToken = (r: HttpRequest<unknown>, t: string | null) =>
    t ? r.clone({ setHeaders: { Authorization: `Bearer ${t}` } }) : r;

  const token = authService.getToken();
  const inicial$ = token || !authService.isLoggedIn() ? of(token) : authService.refrescar();

  return inicial$.pipe(
    switchMap((t) =>
      next(conToken(base, t)).pipe(
        catchError((error: unknown) =>
          es401(error) && t
            ? authService.refrescar().pipe(switchMap((nuevo) => next(conToken(base, nuevo))))
            : throwError(() => error),
        ),
      ),
    ),
    catchError((error: unknown) => {
      // 401 sin poder renovar = la sesión terminó (cookie vencida, revocada o contraseña cambiada)
      if (es401(error)) {
        authService.olvidarSesion();
        router.navigate(['/auth/login'], { queryParams: { sesion: 'expirada' } });
      }
      return throwError(() => error);
    }),
  );
};
