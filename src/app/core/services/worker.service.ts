// src/app/core/services/worker.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Actividad, Pago, Cargo, Trabajador, Nomina, Jornal
} from '../models/worker.model';

// ── DTOs ─────────────────────────────────────────────────────────────────────

export interface TrabajadorRequest {
  nombre:        string;
  apellido:      string;
  cedula:        string;
  telefono?:     string;
  direccion?:    string;
  fechaIngreso:  string;
  tipoContrato:  string;
  cargoId:       number;
}

export interface TrabajadorUpdateRequest {
  nombre:       string;
  apellido:     string;
  telefono?:    string;
  direccion?:   string;
  tipoContrato: string;
}

export interface JornalRequest {
  trabajadorId:  number;
  cultivoId:     number;
  nombreCultivo: string;
  fecha:         string;
  actividadIds:  number[];
  observaciones?: string;
}

export interface PagoRequest {
  nominaId:      number;
  monto:         number;
  metodoPago:    string;
  comprobante?:  string;
  observaciones?: string;
}

export interface NominaRequest {
  trabajadorId:  number;
  periodoInicio: string;
  periodoFin:    string;
}

// ── Servicios ─────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class ActividadService {
  private api = 'http://localhost:8080/api/worker/actividades';
  constructor(private http: HttpClient) {}

  listar(): Observable<Actividad[]> {
    return this.http.get<Actividad[]>(this.api);
  }

  crear(actividad: { nombre: string; descripcion?: string }): Observable<Actividad> {
    return this.http.post<Actividad>(this.api, actividad);
  }

  actualizar(id: number, actividad: { nombre: string; descripcion?: string }): Observable<Actividad> {
    return this.http.put<Actividad>(`${this.api}/${id}`, actividad);
  }

  desactivar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }
}

@Injectable({ providedIn: 'root' })
export class CargoService {
  private api = 'http://localhost:8080/api/cargos';
  constructor(private http: HttpClient) {}

  listar(): Observable<Cargo[]> {
    return this.http.get<Cargo[]>(this.api);
  }

  buscarPorId(id: number): Observable<Cargo> {
    return this.http.get<Cargo>(`${this.api}/${id}`);
  }

  crear(cargo: { nombre: string; descripcion: string; valorJornal: number }): Observable<Cargo> {
    return this.http.post<Cargo>(this.api, cargo);
  }

  actualizar(id: number, cargo: { nombre: string; descripcion: string; valorJornal: number }): Observable<Cargo> {
    return this.http.put<Cargo>(`${this.api}/${id}`, cargo);
  }

  desactivar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }
}

@Injectable({ providedIn: 'root' })
export class TrabajadorService {
  private api = 'http://localhost:8080/api/trabajadores';
  constructor(private http: HttpClient) {}

  // Solo activos (ACTIVO) — para selects de formularios
  listar(): Observable<Trabajador[]> {
    return this.http.get<Trabajador[]>(this.api);
  }

  // ✅ Activos + Suspendidos — para la lista principal con gestión de estado
  listarTodos(): Observable<Trabajador[]> {
    return this.http.get<Trabajador[]>(`${this.api}/todos`);
  }

  buscarPorId(id: number): Observable<Trabajador> {
    return this.http.get<Trabajador>(`${this.api}/${id}`);
  }

  registrar(req: TrabajadorRequest): Observable<Trabajador> {
    return this.http.post<Trabajador>(this.api, req);
  }

  actualizar(id: number, req: TrabajadorUpdateRequest): Observable<Trabajador> {
    return this.http.put<Trabajador>(`${this.api}/${id}`, req);
  }

  cambiarCargo(id: number, cargoId: number): Observable<Trabajador> {
    return this.http.patch<Trabajador>(`${this.api}/${id}/cargo/${cargoId}`, {});
  }

  desactivar(id: number): Observable<void> {
    return this.http.patch<void>(`${this.api}/${id}/desactivar`, {});
  }

  suspender(id: number): Observable<void> {
    return this.http.patch<void>(`${this.api}/${id}/suspender`, {});
  }

  reactivar(id: number): Observable<void> {
    return this.http.patch<void>(`${this.api}/${id}/reactivar`, {});
  }
}

// Reemplaza el NominaService en worker.service.ts

@Injectable({ providedIn: 'root' })
export class NominaService {
  private api = 'http://localhost:8080/api/nominas';
  constructor(private http: HttpClient) {}

  listarTodas(): Observable<Nomina[]> {
    return this.http.get<Nomina[]>(this.api);
  }

  listarPorTrabajador(trabajadorId: number): Observable<Nomina[]> {
    return this.http.get<Nomina[]>(`${this.api}/trabajador/${trabajadorId}`);
  }

  obtener(id: number): Observable<Nomina> {
    return this.http.get<Nomina>(`${this.api}/${id}`);
  }

  generar(req: NominaRequest): Observable<Nomina> {
    return this.http.post<Nomina>(`${this.api}/generar`, req);
  }

  aprobar(id: number): Observable<Nomina> {
    return this.http.patch<Nomina>(`${this.api}/${id}/aprobar`, {});
  }

  anular(id: number): Observable<void> {
    return this.http.patch<void>(`${this.api}/${id}/anular`, {});
  }

  reactivar(id: number): Observable<Nomina> {
    return this.http.patch<Nomina>(`${this.api}/${id}/reactivar`, {});
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }
}

@Injectable({ providedIn: 'root' })
export class JornalService {
  private api = 'http://localhost:8080/api/jornales';
  constructor(private http: HttpClient) {}

  registrar(req: JornalRequest): Observable<Jornal> {
    return this.http.post<Jornal>(this.api, req);
  }

  buscarPorId(id: number): Observable<Jornal> {
    return this.http.get<Jornal>(`${this.api}/${id}`);
  }

  porTrabajador(trabajadorId: number, inicio?: string, fin?: string): Observable<Jornal[]> {
    let params = new HttpParams();
    if (inicio) params = params.set('inicio', inicio);
    if (fin)    params = params.set('fin', fin);
    return this.http.get<Jornal[]>(`${this.api}/trabajador/${trabajadorId}`, { params });
  }

  porCultivo(cultivoId: number, inicio?: string, fin?: string): Observable<Jornal[]> {
    let params = new HttpParams();
    if (inicio) params = params.set('inicio', inicio);
    if (fin)    params = params.set('fin', fin);
    return this.http.get<Jornal[]>(`${this.api}/cultivo/${cultivoId}`, { params });
  }

  agregarActividad(jornalId: number, actividadId: number): Observable<Jornal> {
    return this.http.patch<Jornal>(`${this.api}/${jornalId}/actividades/${actividadId}`, {});
  }

  removerActividad(jornalId: number, actividadId: number): Observable<Jornal> {
    return this.http.delete<Jornal>(`${this.api}/${jornalId}/actividades/${actividadId}`);
  }
}

@Injectable({ providedIn: 'root' })
export class PagoService {
  private api = 'http://localhost:8080/api/pagos';
  constructor(private http: HttpClient) {}

  listarTodos(): Observable<Pago[]> {
    return this.http.get<Pago[]>(this.api);
  }

  buscarPorId(id: number): Observable<Pago> {
    return this.http.get<Pago>(`${this.api}/${id}`);
  }

  historialPorTrabajador(trabajadorId: number): Observable<Pago[]> {
    return this.http.get<Pago[]>(`${this.api}/trabajador/${trabajadorId}`);
  }

  registrar(req: PagoRequest): Observable<Pago> {
    return this.http.post<Pago>(this.api, req);
  }
}
