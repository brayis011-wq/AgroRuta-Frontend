import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/** Correos opcionales. Los de seguridad (recuperar contraseña, cambios de contraseña) llegan siempre. */
export interface PreferenciasCorreo {
  /** Resumen de cada mañana: fumigaciones, labores, reentrada, carencia y clima */
  alertasCultivo: boolean;
  /** Cuando un trabajador pide acceso al portal */
  avisosTrabajadores: boolean;
}

@Injectable({ providedIn: 'root' })
export class NotificacionesService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/notifications/preferences`;

  obtener(): Observable<PreferenciasCorreo> {
    return this.http.get<PreferenciasCorreo>(this.base);
  }

  guardar(p: PreferenciasCorreo): Observable<PreferenciasCorreo> {
    return this.http.put<PreferenciasCorreo>(this.base, p);
  }
}
