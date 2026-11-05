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
    return this.http.post<Finca>(`${this.apiUrl}/api/fincas`, finca);
  }

  listarFincasPorAgricultor(agricultorId: number): Observable<Finca[]> {
    return this.http.get<Finca[]>(`${this.apiUrl}/api/fincas/agricultor/${agricultorId}`);
  }

  buscarFinca(id: number): Observable<Finca> {
    return this.http.get<Finca>(`${this.apiUrl}/api/fincas/${id}`);
  }

  actualizarFinca(id: number, finca: Partial<Finca>): Observable<Finca> {
    return this.http.put<Finca>(`${this.apiUrl}/api/fincas/${id}`, finca);
  }

  eliminarFinca(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/api/fincas/${id}`);
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

  /** Solo nombre y área */
  actualizarLote(id: number, lote: { nombre: string; area: number; fincaId: number }): Observable<Lote> {
    return this.http.put<Lote>(`${this.apiUrl}/api/lotes/${id}`, lote);
  }

  /** DISPONIBLE o EN_DESCANSO (sin siembra en curso) */
  cambiarEstadoLote(id: number, estado: Exclude<EstadoLote, 'EN_CULTIVO'>): Observable<Lote> {
    return this.http.patch<Lote>(`${this.apiUrl}/api/lotes/${id}/estado`, { estado });
  }

  eliminarLote(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/api/lotes/${id}`);
  }

  // Siembras
  registrarSiembra(siembra: SiembraRequest): Observable<Siembra> {
    return this.http.post<Siembra>(`${this.apiUrl}/api/siembras`, siembra);
  }

  /** Siembra en curso del lote (404 si no hay) */
  buscarSiembraPorLote(loteId: number): Observable<Siembra> {
    return this.http.get<Siembra>(`${this.apiUrl}/api/siembras/lote/${loteId}`);
  }

  /** Todas las temporadas del lote, la más reciente primero */
  historialLote(loteId: number): Observable<Siembra[]> {
    return this.http.get<Siembra[]>(`${this.apiUrl}/api/siembras/lote/${loteId}/historial`);
  }

  actualizarSiembra(id: number, siembra: SiembraRequest): Observable<Siembra> {
    return this.http.put<Siembra>(`${this.apiUrl}/api/siembras/${id}`, siembra);
  }

  /** Rendimiento, cosechas por semana, carencia y reentrada vigentes */
  resumenSiembra(id: number): Observable<ResumenSiembra> {
    return this.http.get<ResumenSiembra>(`${this.apiUrl}/api/siembras/${id}/resumen`);
  }

  /** Mano de obra, insumos, otros costos, ingresos y ganancia de la temporada */
  costosSiembra(id: number): Observable<CostosSiembra> {
    return this.http.get<CostosSiembra>(`${this.apiUrl}/api/siembras/${id}/costos`);
  }

  /** Fechas "yyyy-MM-dd"; sin fechas: 30 días atrás y 60 adelante */
  calendarioSiembra(id: number, desde?: string, hasta?: string): Observable<EventoCalendario[]> {
    return this.http.get<EventoCalendario[]>(`${this.apiUrl}/api/siembras/${id}/calendario`, { params: this.rango(desde, hasta) });
  }

  calendarioFinca(fincaId: number, desde?: string, hasta?: string): Observable<EventoCalendario[]> {
    return this.http.get<EventoCalendario[]>(`${this.apiUrl}/api/fincas/${fincaId}/calendario`, { params: this.rango(desde, hasta) });
  }

  private rango(desde?: string, hasta?: string): Record<string, string> {
    const p: Record<string, string> = {};
    if (desde) p['desde'] = desde;
    if (hasta) p['hasta'] = hasta;
    return p;
  }

  etapasSiembra(id: number): Observable<EtapaSiembra[]> {
    return this.http.get<EtapaSiembra[]>(`${this.apiUrl}/api/siembras/${id}/etapas`);
  }

  retrocederEtapa(id: number): Observable<Siembra> {
    return this.http.put<Siembra>(`${this.apiUrl}/api/siembras/${id}/retroceder-etapa`, {});
  }

  /** Cierra la temporada; el lote queda disponible o en descanso */
  finalizarSiembra(id: number, fecha: string | null, dejarEnDescanso: boolean): Observable<Siembra> {
    return this.http.put<Siembra>(`${this.apiUrl}/api/siembras/${id}/finalizar`, { fecha, dejarEnDescanso });
  }

  buscarSiembra(id: number): Observable<Siembra> {
    return this.http.get<Siembra>(`${this.apiUrl}/api/siembras/${id}`);
  }

  /** fecha "yyyy-MM-dd" opcional (por defecto hoy) */
  avanzarEtapa(siembraId: number, fecha?: string | null): Observable<Siembra> {
    const q = fecha ? `?fecha=${encodeURIComponent(fecha)}` : '';
    return this.http.put<Siembra>(`${this.apiUrl}/api/siembras/${siembraId}/avanzar-etapa${q}`, {});
  }

  eliminarSiembra(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/api/siembras/${id}`);
  }

  // Actividades
  registrarActividad(actividad: Partial<ActividadCultivo>): Observable<ActividadCultivo> {
    return this.http.post<ActividadCultivo>(`${this.apiUrl}/api/actividades`, actividad);
  }

  listarActividades(siembraId: number): Observable<ActividadCultivo[]> {
    return this.http.get<ActividadCultivo[]>(`${this.apiUrl}/api/actividades/siembra/${siembraId}`);
  }

  buscarActividad(id: number): Observable<ActividadCultivo> {
    return this.http.get<ActividadCultivo>(`${this.apiUrl}/api/actividades/${id}`);
  }

  actualizarActividad(id: number, actividad: Partial<ActividadCultivo>): Observable<ActividadCultivo> {
    return this.http.put<ActividadCultivo>(`${this.apiUrl}/api/actividades/${id}`, actividad);
  }

  eliminarActividad(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/api/actividades/${id}`);
  }

  // Fumigaciones
  registrarFumigacion(fumigacion: Partial<Fumigacion>): Observable<Fumigacion> {
    return this.http.post<Fumigacion>(`${this.apiUrl}/api/fumigaciones`, fumigacion);
  }

  listarFumigaciones(siembraId: number): Observable<Fumigacion[]> {
    return this.http.get<Fumigacion[]>(`${this.apiUrl}/api/fumigaciones/siembra/${siembraId}`);
  }

  buscarFumigacion(id: number): Observable<Fumigacion> {
    return this.http.get<Fumigacion>(`${this.apiUrl}/api/fumigaciones/${id}`);
  }

  actualizarFumigacion(id: number, fumigacion: Partial<Fumigacion>): Observable<Fumigacion> {
    return this.http.put<Fumigacion>(`${this.apiUrl}/api/fumigaciones/${id}`, fumigacion);
  }

  eliminarFumigacion(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/api/fumigaciones/${id}`);
  }

  // Cosechas
  registrarCosecha(cosecha: Partial<Cosecha>): Observable<Cosecha> {
    return this.http.post<Cosecha>(`${this.apiUrl}/api/cosechas`, cosecha);
  }

  listarCosechas(siembraId: number): Observable<Cosecha[]> {
    return this.http.get<Cosecha[]>(`${this.apiUrl}/api/cosechas/siembra/${siembraId}`);
  }

  buscarCosecha(id: number): Observable<Cosecha> {
    return this.http.get<Cosecha>(`${this.apiUrl}/api/cosechas/${id}`);
  }

  actualizarCosecha(id: number, cosecha: Partial<Cosecha>): Observable<Cosecha> {
    return this.http.put<Cosecha>(`${this.apiUrl}/api/cosechas/${id}`, cosecha);
  }

  eliminarCosecha(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/api/cosechas/${id}`);
  }

  totalKgCosechado(siembraId: number): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/api/cosechas/siembra/${siembraId}/total-kg`);
  }
  actualizarGeometriaLote(loteId: number, body: {
    coordenadas: string;
    area: number;
    centroideLat: number;
    centroideLng: number;
  }): Observable<Lote> {
    return this.http.patch<Lote>(`${this.apiUrl}/api/lotes/${loteId}/geometria`, body);
  }
actualizarCentroideFinca(fincaId: number, body: {
  centroideLat: number;
  centroideLng: number;
}): Observable<Finca> {
  return this.http.patch<Finca>(`${this.apiUrl}/api/fincas/${fincaId}/centroide`, body);
}
}
