import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { EstadoPortal, MiJornal, MiNomina, MiPago } from '../models/portal.model';

@Injectable({ providedIn: 'root' })
export class PortalService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/api/portal`;

  /** Último estado conocido del acceso, compartido por el layout y las páginas. */
  readonly estado$ = new BehaviorSubject<EstadoPortal | null>(null);

  cargarEstado(): Observable<EstadoPortal> {
    return this.http.get<EstadoPortal>(`${this.api}/estado`).pipe(tap((e) => this.estado$.next(e)));
  }

  solicitar(cedula: string): Observable<EstadoPortal> {
    return this.http
      .post<EstadoPortal>(`${this.api}/solicitud`, { cedula })
      .pipe(tap((e) => this.estado$.next(e)));
  }

  jornales(): Observable<MiJornal[]> {
    return this.http.get<MiJornal[]>(`${this.api}/jornales`);
  }

  nominas(): Observable<MiNomina[]> {
    return this.http.get<MiNomina[]>(`${this.api}/nominas`);
  }

  pagos(): Observable<MiPago[]> {
    return this.http.get<MiPago[]>(`${this.api}/pagos`);
  }
}
