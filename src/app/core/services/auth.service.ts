import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, finalize, map, shareReplay, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, LoginRequest, RegisterRequest } from '../models/auth.model';

/** Datos de la persona con sesión (sin token). Sirven para el menú y los guards, y marcan que hay sesión. */
const CLAVE_USUARIO = 'usuario';

/**
 * Sesión en dos piezas:
 * - Token de acceso (JWT, 15 min): solo en memoria, así un XSS no lo encuentra en localStorage.
 * - Token de sesión (30 días): en una cookie httpOnly que el navegador manda solo a /api/auth.
 *   Con ella se pide un token de acceso nuevo cuando vence o al recargar la página.
 */
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/api/auth`;
  private token: string | null = null;
  private renovando$: Observable<string> | null = null;

  constructor(private http: HttpClient) {
    // Las versiones anteriores guardaban el token en localStorage
    localStorage.removeItem('token');
    // Si otra pestaña cierra la sesión, esta también suelta su token
    window.addEventListener('storage', (e) => {
      if (e.key === CLAVE_USUARIO && e.newValue === null) this.token = null;
    });
  }

  registro(data: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, data);
  }

  login(data: LoginRequest): Observable<AuthResponse> {
    // Descarta cualquier sesión anterior sin llamar al servidor: un logout en vuelo
    // podría llegar después y borrar la cookie que trae este login
    this.olvidarSesion();
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, data).pipe(tap((r) => this.guardar(r)));
  }

  /** Enlace del correo de confirmación: confirma la cuenta y deja la sesión iniciada. */
  verificar(token: string): Observable<AuthResponse> {
    this.olvidarSesion();
    return this.http.post<AuthResponse>(`${this.apiUrl}/verify`, { token }).pipe(tap((r) => this.guardar(r)));
  }

  /** Vuelve a mandar el correo de confirmación. Responde igual exista o no la cuenta. */
  reenviarVerificacion(email: string): Observable<{ mensaje: string }> {
    return this.http.post<{ mensaje: string }>(`${this.apiUrl}/resend-verification`, { email });
  }

  /** Pide el enlace para crear una contraseña nueva. Responde igual exista o no la cuenta. */
  recuperar(email: string): Observable<{ mensaje: string }> {
    return this.http.post<{ mensaje: string }>(`${this.apiUrl}/forgot-password`, { email });
  }

  /** Crea la contraseña nueva con el token del enlace que llegó al correo. */
  restablecer(token: string, password: string): Observable<{ mensaje: string }> {
    return this.http.post<{ mensaje: string }>(`${this.apiUrl}/reset-password`, { token, password });
  }

  /**
   * Pide un token de acceso nuevo con la cookie de sesión. Si varias peticiones lo necesitan
   * a la vez comparten la misma llamada, así la cookie no se rota dos veces.
   */
  refrescar(): Observable<string> {
    if (!this.renovando$) {
      this.renovando$ = this.http.post<AuthResponse>(`${this.apiUrl}/refresh`, {}).pipe(
        tap((r) => this.guardar(r)),
        map((r) => r.token),
        finalize(() => (this.renovando$ = null)),
        shareReplay(1),
      );
    }
    return this.renovando$;
  }

  /** Cambió la contraseña: el servidor cerró las sesiones viejas y mandó un token y una cookie nuevos. */
  renovarToken(token: string): void {
    this.token = token;
  }

  /** La persona cierra sesión: se avisa al servidor para que la cookie deje de servir. */
  logout(): void {
    this.olvidarSesion();
    this.http.post(`${this.apiUrl}/logout`, {}).subscribe({ error: () => undefined });
  }

  /** Borra la sesión solo en este navegador (la cookie ya no sirve o se va a reemplazar). */
  olvidarSesion(): void {
    this.token = null;
    localStorage.removeItem(CLAVE_USUARIO);
  }

  /** Token de acceso vigente, o null si no hay o está por vencer (entonces hay que renovarlo). */
  getToken(): string | null {
    return this.token && !this.tokenVencido(this.token) ? this.token : null;
  }

  /**
   * Hay una sesión abierta en este navegador. El token de acceso puede haber vencido: lo renueva
   * el interceptor en la primera llamada, y si la cookie ya no sirve manda al login.
   */
  isLoggedIn(): boolean {
    return this.getUsuario() !== null;
  }

  getUsuario(): AuthResponse | null {
    try {
      const u = localStorage.getItem(CLAVE_USUARIO);
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  }

  private guardar(r: AuthResponse): void {
    if (!r?.token) return;
    this.token = r.token;
    const { token: _token, ...usuario } = r;
    localStorage.setItem(CLAVE_USUARIO, JSON.stringify(usuario));
  }

  /**
   * Lee el campo `exp` (segundos desde 1970) del payload del JWT, con 30 s de margen.
   * Si no se puede leer se considera vigente y el servidor decide (401 → se renueva).
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
      return typeof exp === 'number' && exp * 1000 - 30_000 <= Date.now();
    } catch {
      return false;
    }
  }
}
