import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/** Verificación en dos pasos de la cuenta */
export interface EstadoDosPasos {
  activo: boolean;
  /** Códigos de respaldo que quedan sin usar */
  codigosRespaldo: number;
}

/** Lo que se muestra una sola vez para enlazar la app de autenticación */
export interface PreparacionDosPasos {
  secreto: string;
  uri: string;
  /** QR listo para un <img> (data URI en SVG) */
  qr: string;
}

/** Un dispositivo donde la cuenta tiene la sesión iniciada */
export interface SesionAbierta {
  id: number;
  dispositivo: string;
  iniciadaEn: string;
  ultimoUso: string;
  /** Es la sesión de este navegador */
  actual: boolean;
}

@Injectable({ providedIn: 'root' })
export class SeguridadService {
  private dosPasosUrl = `${environment.apiUrl}/api/configuration/security/2fa`;
  /** Bajo /api/auth: es la única ruta a la que el navegador manda la cookie de sesión */
  private sesionesUrl = `${environment.apiUrl}/api/auth/sessions`;

  constructor(private http: HttpClient) {}

  estado(): Observable<EstadoDosPasos> {
    return this.http.get<EstadoDosPasos>(this.dosPasosUrl);
  }

  preparar(password: string): Observable<PreparacionDosPasos> {
    return this.http.post<PreparacionDosPasos>(`${this.dosPasosUrl}/setup`, { password });
  }

  activar(codigo: string): Observable<{ codigosRespaldo: string[] }> {
    return this.http.post<{ codigosRespaldo: string[] }>(`${this.dosPasosUrl}/enable`, { codigo });
  }

  desactivar(password: string, codigo: string): Observable<void> {
    return this.http.post<void>(`${this.dosPasosUrl}/disable`, { password, codigo });
  }

  sesiones(): Observable<SesionAbierta[]> {
    return this.http.get<SesionAbierta[]>(this.sesionesUrl);
  }

  cerrarSesion(id: number): Observable<void> {
    return this.http.delete<void>(`${this.sesionesUrl}/${id}`);
  }

  cerrarOtras(): Observable<{ cerradas: number }> {
    return this.http.post<{ cerradas: number }>(`${this.sesionesUrl}/close-others`, {});
  }
}
