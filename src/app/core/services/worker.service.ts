import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Labor, Pago, Cargo, Trabajador, Nomina, Jornal
} from '../models/worker.model';

// ── DTOs ──────────────────────────────────────────────────────────────────────
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
  /** Lo ignora el backend: guarda el nombre real del cultivo (lote · finca). */
  nombreCultivo?: string;
  fecha:         string;
  actividadIds:  number[];
  observaciones?: string;
}

/** Cultivo activo en una finca del agricultor, para el formulario de jornal. */
export interface CultivoDisponible {
  id:          number;
  fincaId:     number;
  fincaNombre: string;
  loteId:      number;
  loteNombre:  string;
  tipoCultivo: string | null;
  variedad:    string | null;
  estado:      string | null;
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

// ── Servicios ──────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class LaborService {
  private api = `${environment.apiUrl}/api/labors`;
  constructor(private http: HttpClient) {}

  listar(): Observable<Labor[]> { return this.http.get<Labor[]>(this.api); }
  crear(a: { nombre: string; descripcion?: string }): Observable<Labor> { return this.http.post<Labor>(this.api, a); }
  actualizar(id: number, a: { nombre: string; descripcion?: string }): Observable<Labor> { return this.http.put<Labor>(`${this.api}/${id}`, a); }
  desactivar(id: number): Observable<void> { return this.http.patch<void>(`${this.api}/${id}/deactivate`, {}); }
}

@Injectable({ providedIn: 'root' })
export class CargoService {
  private api = `${environment.apiUrl}/api/positions`;
  constructor(private http: HttpClient) {}

  listar(): Observable<Cargo[]> { return this.http.get<Cargo[]>(this.api); }
  buscarPorId(id: number): Observable<Cargo> { return this.http.get<Cargo>(`${this.api}/${id}`); }
  crear(c: { nombre: string; descripcion: string; valorJornal: number }): Observable<Cargo> { return this.http.post<Cargo>(this.api, c); }
  actualizar(id: number, c: { nombre: string; descripcion: string; valorJornal: number }): Observable<Cargo> { return this.http.put<Cargo>(`${this.api}/${id}`, c); }
  desactivar(id: number): Observable<void> { return this.http.patch<void>(`${this.api}/${id}/deactivate`, {}); }
}

@Injectable({ providedIn: 'root' })
export class TrabajadorService {
  private api = `${environment.apiUrl}/api/workers`;
  constructor(private http: HttpClient) {}

  listar(): Observable<Trabajador[]> { return this.http.get<Trabajador[]>(this.api); }
  listarTodos(): Observable<Trabajador[]> { return this.http.get<Trabajador[]>(`${this.api}/all`); }
  buscarPorId(id: number): Observable<Trabajador> { return this.http.get<Trabajador>(`${this.api}/${id}`); }
  registrar(req: TrabajadorRequest): Observable<Trabajador> { return this.http.post<Trabajador>(this.api, req); }
  actualizar(id: number, req: TrabajadorUpdateRequest): Observable<Trabajador> { return this.http.put<Trabajador>(`${this.api}/${id}`, req); }
  cambiarCargo(id: number, cargoId: number): Observable<Trabajador> { return this.http.patch<Trabajador>(`${this.api}/${id}/position/${cargoId}`, {}); }
  desactivar(id: number): Observable<void> { return this.http.patch<void>(`${this.api}/${id}/deactivate`, {}); }
  suspender(id: number): Observable<void> { return this.http.patch<void>(`${this.api}/${id}/suspend`, {}); }
  reactivar(id: number): Observable<void> { return this.http.patch<void>(`${this.api}/${id}/reactivate`, {}); }
  aprobarAcceso(id: number): Observable<Trabajador> { return this.http.patch<Trabajador>(`${this.api}/${id}/access/approve`, {}); }
  rechazarAcceso(id: number): Observable<Trabajador> { return this.http.patch<Trabajador>(`${this.api}/${id}/access/reject`, {}); }
}

@Injectable({ providedIn: 'root' })
export class NominaService {
  private api = `${environment.apiUrl}/api/payrolls`;
  constructor(private http: HttpClient) {}

  listarTodas(): Observable<Nomina[]> { return this.http.get<Nomina[]>(this.api); }
  listarPorTrabajador(trabajadorId: number): Observable<Nomina[]> { return this.http.get<Nomina[]>(`${this.api}/worker/${trabajadorId}`); }
  obtener(id: number): Observable<Nomina> { return this.http.get<Nomina>(`${this.api}/${id}`); }
  generar(req: NominaRequest): Observable<Nomina> { return this.http.post<Nomina>(`${this.api}/generate`, req); }
  aprobar(id: number): Observable<Nomina> { return this.http.patch<Nomina>(`${this.api}/${id}/approve`, {}); }
  anular(id: number): Observable<void> { return this.http.patch<void>(`${this.api}/${id}/void`, {}); }
  reactivar(id: number): Observable<Nomina> { return this.http.patch<Nomina>(`${this.api}/${id}/reactivate`, {}); }
  eliminar(id: number): Observable<void> { return this.http.delete<void>(`${this.api}/${id}`); }
}

@Injectable({ providedIn: 'root' })
export class JornalService {
  private api = `${environment.apiUrl}/api/workdays`;
  constructor(private http: HttpClient) {}

  registrar(req: JornalRequest): Observable<Jornal> { return this.http.post<Jornal>(this.api, req); }
  cultivosDisponibles(): Observable<CultivoDisponible[]> { return this.http.get<CultivoDisponible[]>(`${this.api}/available-plantings`); }
  buscarPorId(id: number): Observable<Jornal> { return this.http.get<Jornal>(`${this.api}/${id}`); }
  porTrabajador(trabajadorId: number, inicio?: string, fin?: string): Observable<Jornal[]> {
    let params = new HttpParams();
    if (inicio) params = params.set('inicio', inicio);
    if (fin)    params = params.set('fin', fin);
    return this.http.get<Jornal[]>(`${this.api}/worker/${trabajadorId}`, { params });
  }
  porCultivo(cultivoId: number, inicio?: string, fin?: string): Observable<Jornal[]> {
    let params = new HttpParams();
    if (inicio) params = params.set('inicio', inicio);
    if (fin)    params = params.set('fin', fin);
    return this.http.get<Jornal[]>(`${this.api}/planting/${cultivoId}`, { params });
  }
  agregarActividad(jornalId: number, actividadId: number): Observable<Jornal> { return this.http.patch<Jornal>(`${this.api}/${jornalId}/activities/${actividadId}`, {}); }
  removerActividad(jornalId: number, actividadId: number): Observable<Jornal> { return this.http.delete<Jornal>(`${this.api}/${jornalId}/activities/${actividadId}`); }
}

@Injectable({ providedIn: 'root' })
export class PagoService {
  private api = `${environment.apiUrl}/api/payments`;
  constructor(private http: HttpClient) {}

  listarTodos(): Observable<Pago[]> { return this.http.get<Pago[]>(this.api); }
  buscarPorId(id: number): Observable<Pago> { return this.http.get<Pago>(`${this.api}/${id}`); }
  historialPorTrabajador(trabajadorId: number): Observable<Pago[]> { return this.http.get<Pago[]>(`${this.api}/worker/${trabajadorId}`); }
  registrar(req: PagoRequest): Observable<Pago> { return this.http.post<Pago>(this.api, req); }
}
