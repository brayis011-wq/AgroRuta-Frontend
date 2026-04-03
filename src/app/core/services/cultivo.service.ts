import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Finca,
  Lote,
  Siembra,
  ActividadCultivo,
  Fumigacion,
  Cosecha,
} from '../models/cultivo.model';

@Injectable({
  providedIn: 'root',
})
export class CultivoService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Fincas
  registrarFinca(finca: Partial<Finca>): Observable<Finca> {
    return this.http.post<Finca>(`${this.apiUrl}/api/fincas`, finca);
  }

  listarFincasPorAgricultor(agricultorId: number): Observable<Finca[]> {
    return this.http.get<Finca[]>(`${this.apiUrl}/api/fincas/agricultor/${agricultorId}`);
  }

  buscarFinca(id: number): Observable<Finca> {
    return this.http.get<Finca>(`${this.apiUrl}/api/fincas/${id}`);
  }

  // Lotes
  registrarLote(lote: Partial<Lote>): Observable<Lote> {
    return this.http.post<Lote>(`${this.apiUrl}/api/lotes`, lote);
  }

  listarLotesPorFinca(fincaId: number): Observable<Lote[]> {
    return this.http.get<Lote[]>(`${this.apiUrl}/api/lotes/finca/${fincaId}`);
  }

  buscarLote(id: number): Observable<Lote> {
    return this.http.get<Lote>(`${this.apiUrl}/api/lotes/${id}`);
  }

  // Siembras
  registrarSiembra(siembra: Partial<Siembra>): Observable<Siembra> {
    return this.http.post<Siembra>(`${this.apiUrl}/api/siembras`, siembra);
  }

  buscarSiembraPorLote(loteId: number): Observable<Siembra> {
    return this.http.get<Siembra>(`${this.apiUrl}/api/siembras/lote/${loteId}`);
  }

  buscarSiembra(id: number): Observable<Siembra> {
    return this.http.get<Siembra>(`${this.apiUrl}/api/siembras/${id}`);
  }

  avanzarEtapa(siembraId: number): Observable<Siembra> {
    return this.http.put<Siembra>(`${this.apiUrl}/api/siembras/${siembraId}/avanzar-etapa`, {});
  }

  // Actividades
  registrarActividad(actividad: Partial<ActividadCultivo>): Observable<ActividadCultivo> {
    return this.http.post<ActividadCultivo>(`${this.apiUrl}/api/actividades`, actividad);
  }

  listarActividades(siembraId: number): Observable<ActividadCultivo[]> {
    return this.http.get<ActividadCultivo[]>(`${this.apiUrl}/api/actividades/siembra/${siembraId}`);
  }

  // Fumigaciones
  registrarFumigacion(fumigacion: Partial<Fumigacion>): Observable<Fumigacion> {
    return this.http.post<Fumigacion>(`${this.apiUrl}/api/fumigaciones`, fumigacion);
  }

  listarFumigaciones(siembraId: number): Observable<Fumigacion[]> {
    return this.http.get<Fumigacion[]>(`${this.apiUrl}/api/fumigaciones/siembra/${siembraId}`);
  }

  // Cosechas
  registrarCosecha(cosecha: Partial<Cosecha>): Observable<Cosecha> {
    return this.http.post<Cosecha>(`${this.apiUrl}/api/cosechas`, cosecha);
  }

  listarCosechas(siembraId: number): Observable<Cosecha[]> {
    return this.http.get<Cosecha[]>(`${this.apiUrl}/api/cosechas/siembra/${siembraId}`);
  }

  totalKgCosechado(siembraId: number): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/api/cosechas/siembra/${siembraId}/total-kg`);
  }
}
