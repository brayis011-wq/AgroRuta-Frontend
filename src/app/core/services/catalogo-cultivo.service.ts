import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TipoCultivo, VariedadCultivo } from '../models/cultivo.model';

/** Catálogo de cultivos y variedades (lo edita el administrador) */
@Injectable({ providedIn: 'root' })
export class CatalogoCultivoService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/api/crop-catalog`;

  /** Cultivos y variedades activos, para registrar una siembra */
  activos(): Observable<TipoCultivo[]> { return this.http.get<TipoCultivo[]>(this.api); }
  /** Todo el catálogo, incluidos los desactivados (solo administrador) */
  todos(): Observable<TipoCultivo[]> { return this.http.get<TipoCultivo[]>(`${this.api}/all`); }

  crearTipo(nombre: string): Observable<TipoCultivo> {
    return this.http.post<TipoCultivo>(`${this.api}/types`, { nombre });
  }
  crearVariedad(tipoId: number, nombre: string): Observable<VariedadCultivo> {
    return this.http.post<VariedadCultivo>(`${this.api}/types/${tipoId}/varieties`, { nombre });
  }
  estadoTipo(id: number, activo: boolean): Observable<TipoCultivo> {
    return this.http.patch<TipoCultivo>(`${this.api}/types/${id}/status`, null, { params: new HttpParams().set('activo', activo) });
  }
  estadoVariedad(id: number, activo: boolean): Observable<VariedadCultivo> {
    return this.http.patch<VariedadCultivo>(`${this.api}/varieties/${id}/status`, null, { params: new HttpParams().set('activo', activo) });
  }
}
