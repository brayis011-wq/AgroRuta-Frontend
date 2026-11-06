import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, LoginRequest, RegisterRequest } from '../models/auth.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/api/auth`;

  constructor(private http: HttpClient) {}

  registro(data: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/registro`, data);
  }

  login(data: LoginRequest): Observable<AuthResponse> {
    // Descarta cualquier sesión anterior antes de iniciar una nueva
    this.logout();
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, data).pipe(
      tap((response) => {
        localStorage.setItem('token', response.token);
        localStorage.setItem('usuario', JSON.stringify(response));
      }),
    );
  }

  /** Enlace del correo de confirmación: confirma la cuenta y deja la sesión iniciada. */
  verificar(token: string): Observable<AuthResponse> {
    this.logout();
    return this.http.post<AuthResponse>(`${this.apiUrl}/verificar`, { token }).pipe(
      tap((response) => {
        localStorage.setItem('token', response.token);
        localStorage.setItem('usuario', JSON.stringify(response));
      }),
    );
  }

  /** Vuelve a mandar el correo de confirmación. Responde igual exista o no la cuenta. */
  reenviarVerificacion(email: string): Observable<{ mensaje: string }> {
    return this.http.post<{ mensaje: string }>(`${this.apiUrl}/reenviar-verificacion`, { email });
  }

  /** Pide el enlace para crear una contraseña nueva. Responde igual exista o no la cuenta. */
  recuperar(email: string): Observable<{ mensaje: string }> {
    return this.http.post<{ mensaje: string }>(`${this.apiUrl}/recuperar`, { email });
  }

  /** Crea la contraseña nueva con el token del enlace que llegó al correo. */
  restablecer(token: string, password: string): Observable<{ mensaje: string }> {
    return this.http.post<{ mensaje: string }>(`${this.apiUrl}/restablecer`, { token, password });
  }

  /** Cambió la contraseña: el servidor cerró las sesiones viejas y mandó un token nuevo. */
  renovarToken(token: string): void {
    localStorage.setItem('token', token);
    try {
      const usuario = JSON.parse(localStorage.getItem('usuario') ?? 'null');
      if (usuario) localStorage.setItem('usuario', JSON.stringify({ ...usuario, token }));
    } catch {
      /* usuario guardado ilegible: con el token basta */
    }
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  /** Hay token y todavía no venció. El servidor sigue siendo quien decide en última instancia. */
  isLoggedIn(): boolean {
    const token = this.getToken();
    return !!token && !this.tokenVencido(token);
  }

  getUsuario(): AuthResponse | null {
    const u = localStorage.getItem('usuario');
    return u ? JSON.parse(u) : null;
  }

  /**
   * Lee el campo `exp` (segundos desde 1970) del payload del JWT.
   * Si el token no se puede leer, se considera vigente y deja que el servidor
   * lo rechace con 401 (el interceptor cierra la sesión en ese caso).
   */
  private tokenVencido(token: string): boolean {
    try {
      const payload = token.split('.')[1];
      if (!payload) return false;

      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      const json = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join(''),
      );
      const exp = JSON.parse(json).exp;
      return typeof exp === 'number' && exp * 1000 <= Date.now();
    } catch {
      return false;
    }
  }
}
