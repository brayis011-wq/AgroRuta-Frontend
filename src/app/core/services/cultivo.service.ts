import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Finca,
  Lote,
  Siembra, SiembraRequest, EtapaSiembra, EstadoLote, ResumenSiembra, CostosSiembra, EventoCalendario,
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
    return this.http.post<Finca>(`${this.apiUrl}/api/farms`, finca);
  }

  listarFincasPorAgricultor(agricultorId: number): Observable<Finca[]> {
    return this.http.get<Finca[]>(`${this.apiUrl}/api/farms/farmer/${agricultorId}`);
  }

  buscarFinca(id: number): Observable<Finca> {
    return this.http.get<Finca>(`${this.apiUrl}/api/farms/${id}`);
  }

  actualizarFinca(id: number, finca: Partial<Finca>): Observable<Finca> {
    return this.http.put<Finca>(`${this.apiUrl}/api/farms/${id}`, finca);
  }

  eliminarFinca(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/api/farms/${id}`);
  }

  // Lotes
  registrarLote(lote: Partial<Lote>): Observable<Lote> {
    return this.http.post<Lote>(`${this.apiUrl}/api/plots`, lote);
  }

  listarLotesPorFinca(fincaId: number): Observable<Lote[]> {
    return this.http.get<Lote[]>(`${this.apiUrl}/api/plots/farm/${fincaId}`);
  }

  buscarLote(id: number): Observable<Lote> {
    return this.http.get<Lote>(`${this.apiUrl}/api/plots/${id}`);
  }

  /** Solo nombre y área */
  actualizarLote(id: number, lote: { nombre: string; area: number; fincaId: number }): Observable<Lote> {
    return this.http.put<Lote>(`${this.apiUrl}/api/plots/${id}`, lote);
  }

  /** DISPONIBLE o EN_DESCANSO (sin siembra en curso) */
  cambiarEstadoLote(id: number, estado: Exclude<EstadoLote, 'EN_CULTIVO'>): Observable<Lote> {
    return this.http.patch<Lote>(`${this.apiUrl}/api/plots/${id}/status`, { estado });
  }

  eliminarLote(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/api/plots/${id}`);
  }

  // Siembras
  registrarSiembra(siembra: SiembraRequest): Observable<Siembra> {
    return this.http.post<Siembra>(`${this.apiUrl}/api/plantings`, siembra);
  }

  /** Siembra en curso del lote (404 si no hay) */
  buscarSiembraPorLote(loteId: number): Observable<Siembra> {
    return this.http.get<Siembra>(`${this.apiUrl}/api/plantings/plot/${loteId}`);
  }

  /** Todas las temporadas del lote, la más reciente primero */
  historialLote(loteId: number): Observable<Siembra[]> {
    return this.http.get<Siembra[]>(`${this.apiUrl}/api/plantings/plot/${loteId}/history`);
  }

  actualizarSiembra(id: number, siembra: SiembraRequest): Observable<Siembra> {
    return this.http.put<Siembra>(`${this.apiUrl}/api/plantings/${id}`, siembra);
  }

  /** Rendimiento, cosechas por semana, carencia y reentrada vigentes */
  resumenSiembra(id: number): Observable<ResumenSiembra> {
    return this.http.get<ResumenSiembra>(`${this.apiUrl}/api/plantings/${id}/summary`);
  }

  /** Mano de obra, insumos, otros costos, ingresos y ganancia de la temporada */
  costosSiembra(id: number): Observable<CostosSiembra> {
    return this.http.get<CostosSiembra>(`${this.apiUrl}/api/plantings/${id}/costs`);
  }

  /** Fechas "yyyy-MM-dd"; sin fechas: 30 días atrás y 60 adelante */
  calendarioSiembra(id: number, desde?: string, hasta?: string): Observable<EventoCalendario[]> {
    return this.http.get<EventoCalendario[]>(`${this.apiUrl}/api/plantings/${id}/calendar`, { params: this.rango(desde, hasta) });
  }

  calendarioFinca(fincaId: number, desde?: string, hasta?: string): Observable<EventoCalendario[]> {
    return this.http.get<EventoCalendario[]>(`${this.apiUrl}/api/farms/${fincaId}/calendar`, { params: this.rango(desde, hasta) });
  }

  private rango(desde?: string, hasta?: string): Record<string, string> {
    const p: Record<string, string> = {};
    if (desde) p['desde'] = desde;
    if (hasta) p['hasta'] = hasta;
    return p;
  }

  etapasSiembra(id: number): Observable<EtapaSiembra[]> {
    return this.http.get<EtapaSiembra[]>(`${this.apiUrl}/api/plantings/${id}/stages`);
  }

  retrocederEtapa(id: number): Observable<Siembra> {
    return this.http.patch<Siembra>(`${this.apiUrl}/api/plantings/${id}/revert-stage`, {});
  }

  /** Cierra la temporada; el lote queda disponible o en descanso */
  finalizarSiembra(id: number, fecha: string | null, dejarEnDescanso: boolean): Observable<Siembra> {
    return this.http.patch<Siembra>(`${this.apiUrl}/api/plantings/${id}/finish`, { fecha, dejarEnDescanso });
  }

  buscarSiembra(id: number): Observable<Siembra> {
    return this.http.get<Siembra>(`${this.apiUrl}/api/plantings/${id}`);
  }

  /** fecha "yyyy-MM-dd" opcional (por defecto hoy) */
  avanzarEtapa(siembraId: number, fecha?: string | null): Observable<Siembra> {
    const q = fecha ? `?fecha=${encodeURIComponent(fecha)}` : '';
    return this.http.patch<Siembra>(`${this.apiUrl}/api/plantings/${siembraId}/advance-stage${q}`, {});
  }

  eliminarSiembra(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/api/plantings/${id}`);
  }

  // Actividades
  registrarActividad(actividad: Partial<ActividadCultivo>): Observable<ActividadCultivo> {
    return this.http.post<ActividadCultivo>(`${this.apiUrl}/api/activities`, actividad);
  }

  listarActividades(siembraId: number): Observable<ActividadCultivo[]> {
    return this.http.get<ActividadCultivo[]>(`${this.apiUrl}/api/activities/planting/${siembraId}`);
  }

  buscarActividad(id: number): Observable<ActividadCultivo> {
    return this.http.get<ActividadCultivo>(`${this.apiUrl}/api/activities/${id}`);
  }

  actualizarActividad(id: number, actividad: Partial<ActividadCultivo>): Observable<ActividadCultivo> {
    return this.http.put<ActividadCultivo>(`${this.apiUrl}/api/activities/${id}`, actividad);
  }

  eliminarActividad(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/api/activities/${id}`);
  }

  // Fumigaciones
  registrarFumigacion(fumigacion: Partial<Fumigacion>): Observable<Fumigacion> {
    return this.http.post<Fumigacion>(`${this.apiUrl}/api/sprayings`, fumigacion);
  }

  listarFumigaciones(siembraId: number): Observable<Fumigacion[]> {
    return this.http.get<Fumigacion[]>(`${this.apiUrl}/api/sprayings/planting/${siembraId}`);
  }

  buscarFumigacion(id: number): Observable<Fumigacion> {
    return this.http.get<Fumigacion>(`${this.apiUrl}/api/sprayings/${id}`);
  }

  actualizarFumigacion(id: number, fumigacion: Partial<Fumigacion>): Observable<Fumigacion> {
    return this.http.put<Fumigacion>(`${this.apiUrl}/api/sprayings/${id}`, fumigacion);
  }

  eliminarFumigacion(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/api/sprayings/${id}`);
  }

  // Cosechas
  registrarCosecha(cosecha: Partial<Cosecha>): Observable<Cosecha> {
    return this.http.post<Cosecha>(`${this.apiUrl}/api/harvests`, cosecha);
  }

  listarCosechas(siembraId: number): Observable<Cosecha[]> {
    return this.http.get<Cosecha[]>(`${this.apiUrl}/api/harvests/planting/${siembraId}`);
  }

  buscarCosecha(id: number): Observable<Cosecha> {
    return this.http.get<Cosecha>(`${this.apiUrl}/api/harvests/${id}`);
  }

  actualizarCosecha(id: number, cosecha: Partial<Cosecha>): Observable<Cosecha> {
    return this.http.put<Cosecha>(`${this.apiUrl}/api/harvests/${id}`, cosecha);
  }

  eliminarCosecha(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/api/harvests/${id}`);
  }

  totalKgCosechado(siembraId: number): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/api/harvests/planting/${siembraId}/total-kg`);
  }
  actualizarGeometriaLote(loteId: number, body: {
    coordenadas: string;
    area: number;
    centroideLat: number;
    centroideLng: number;
  }): Observable<Lote> {
    return this.http.patch<Lote>(`${this.apiUrl}/api/plots/${loteId}/geometry`, body);
  }
actualizarCentroideFinca(fincaId: number, body: {
  centroideLat: number;
  centroideLng: number;
}): Observable<Finca> {
  return this.http.patch<Finca>(`${this.apiUrl}/api/farms/${fincaId}/centroid`, body);
}
}
