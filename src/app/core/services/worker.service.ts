import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  RendimientoTrabajador,
  Labor,
  Pago,
  Cargo,
  Trabajador,
  Nomina,
  Jornal,
  ResumenNominas,
  ResumenJornales,
  ResumenJornalesInicio,
  ResumenPagos,
  PagosDelMes,
} from '../models/worker.model';
import { Pagina, TAMANO_PAGINA } from '../models/pagina.model';

// ── DTOs ──────────────────────────────────────────────────────────────────────
export interface TrabajadorRequest {
  nombre: string;
  apellido: string;
  cedula: string;
  telefono?: string;
  direccion?: string;
  fechaIngreso: string;
  tipoContrato: string;
  cargoId: number;
}

export interface TrabajadorUpdateRequest {
  nombre: string;
  apellido: string;
  telefono?: string;
  direccion?: string;
  tipoContrato: string;
}

export interface JornalRequest {
  trabajadorId: number;
  cultivoId: number;
  /** Lo ignora el backend: guarda el nombre real del cultivo (lote · finca). */
  nombreCultivo?: string;
  fecha: string;
  actividadIds: number[];
  /** Kilos recogidos: obligatorio si el cargo del trabajador se paga por kilo */
  kilos?: number | null;
  observaciones?: string;
}

/** Cultivo activo en una finca del agricultor, para el formulario de jornal. */
export interface CultivoDisponible {
  id: number;
  fincaId: number;
  fincaNombre: string;
  loteId: number;
  loteNombre: string;
  tipoCultivo: string | null;
  variedad: string | null;
  estado: string | null;
}

export interface PagoRequest {
  nominaId: number;
  monto: number;
  metodoPago: string;
  comprobante?: string;
  observaciones?: string;
}

/** Lo que necesita un cargo: por día (valorJornal) o por kilo (valorKilo) */
export interface CargoRequest {
  nombre: string;
  descripcion: string;
  modalidadPago?: 'JORNAL' | 'KILO';
  valorJornal?: number | null;
  valorKilo?: number | null;
}

/** Una fila de la planilla: el trabajador y cómo se le paga */
export interface FilaPlanilla {
  id: number;
  nombreCompleto: string;
  iniciales: string;
  activo: boolean;
  cargo: string | null;
  modalidadPago: 'JORNAL' | 'KILO';
  valorJornal: number | null;
  valorKilo: number | null;
}

/** Un jornal en la cuadrícula */
export interface CasillaPlanilla {
  id: number;
  trabajadorId: number;
  fecha: string;
  cultivoId: number;
  nombreCultivo: string;
  valor: number;
  kilos: number | null;
  liquidado: boolean;
  enNomina: boolean;
  /** Estado de la nómina en que quedó: PENDIENTE se puede corregir; APROBADA o PAGADA no */
  nominaEstado: 'PENDIENTE' | 'APROBADA' | 'PAGADA' | 'ANULADA' | null;
}

/** GET /api/workdays/sheet */
export interface Planilla {
  inicio: string;
  fin: string;
  trabajadores: FilaPlanilla[];
  jornales: CasillaPlanilla[];
}

export interface PlanillaRequest {
  cultivoId: number;
  actividadIds: number[];
  entradas: { trabajadorId: number; fecha: string; kilos?: number | null }[];
}

export interface NominaRequest {
  trabajadorId: number;
  periodoInicio: string;
  periodoFin: string;
}

// ── Servicios ──────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class LaborService {
  private api = `${environment.apiUrl}/api/labors`;
  constructor(private http: HttpClient) {}

  listar(): Observable<Labor[]> {
    return this.http.get<Labor[]>(this.api);
  }
  crear(a: { nombre: string; descripcion?: string }): Observable<Labor> {
    return this.http.post<Labor>(this.api, a);
  }
  actualizar(id: number, a: { nombre: string; descripcion?: string }): Observable<Labor> {
    return this.http.put<Labor>(`${this.api}/${id}`, a);
  }
  desactivar(id: number): Observable<void> {
    return this.http.patch<void>(`${this.api}/${id}/deactivate`, {});
  }
}

@Injectable({ providedIn: 'root' })
export class CargoService {
  private api = `${environment.apiUrl}/api/positions`;
  constructor(private http: HttpClient) {}

  listar(): Observable<Cargo[]> {
    return this.http.get<Cargo[]>(this.api);
  }
  buscarPorId(id: number): Observable<Cargo> {
    return this.http.get<Cargo>(`${this.api}/${id}`);
  }
  crear(c: CargoRequest): Observable<Cargo> {
    return this.http.post<Cargo>(this.api, c);
  }
  actualizar(id: number, c: CargoRequest): Observable<Cargo> {
    return this.http.put<Cargo>(`${this.api}/${id}`, c);
  }
  desactivar(id: number): Observable<void> {
    return this.http.patch<void>(`${this.api}/${id}/deactivate`, {});
  }
  /** Agrega los cargos típicos de una finca que aún no tiene; devuelve los creados */
  crearTipicos(): Observable<Cargo[]> {
    return this.http.post<Cargo[]>(`${this.api}/defaults`, {});
  }
}

@Injectable({ providedIn: 'root' })
export class TrabajadorService {
  private api = `${environment.apiUrl}/api/workers`;
  constructor(private http: HttpClient) {}

  listar(): Observable<Trabajador[]> {
    return this.http.get<Trabajador[]>(this.api);
  }
  listarTodos(): Observable<Trabajador[]> {
    return this.http.get<Trabajador[]>(`${this.api}/all`);
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
    return this.http.patch<Trabajador>(`${this.api}/${id}/position/${cargoId}`, {});
  }
  desactivar(id: number): Observable<void> {
    return this.http.patch<void>(`${this.api}/${id}/deactivate`, {});
  }
  suspender(id: number): Observable<void> {
    return this.http.patch<void>(`${this.api}/${id}/suspend`, {});
  }
  reactivar(id: number): Observable<void> {
    return this.http.patch<void>(`${this.api}/${id}/reactivate`, {});
  }
  aprobarAcceso(id: number): Observable<Trabajador> {
    return this.http.patch<Trabajador>(`${this.api}/${id}/access/approve`, {});
  }
  rechazarAcceso(id: number): Observable<Trabajador> {
    return this.http.patch<Trabajador>(`${this.api}/${id}/access/reject`, {});
  }
}

@Injectable({ providedIn: 'root' })
export class NominaService {
  private api = `${environment.apiUrl}/api/payrolls`;
  constructor(private http: HttpClient) {}

  /** Nóminas por páginas, más recientes primero. */
  pagina(
    page: number,
    filtros: { trabajadorId?: number | null; estado?: string | null } = {},
    size = TAMANO_PAGINA,
  ): Observable<Pagina<Nomina>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (filtros.trabajadorId != null) params = params.set('trabajadorId', filtros.trabajadorId);
    if (filtros.estado) params = params.set('estado', filtros.estado);
    return this.http.get<Pagina<Nomina>>(`${this.api}/page`, { params });
  }
  /** Cantidad y total por estado: para las tarjetas de la lista, el inicio y el contador del menú. */
  resumen(trabajadorId?: number | null): Observable<ResumenNominas[]> {
    const params =
      trabajadorId != null ? new HttpParams().set('trabajadorId', trabajadorId) : undefined;
    return this.http.get<ResumenNominas[]>(`${this.api}/summary`, { params });
  }
  listarPorTrabajador(trabajadorId: number): Observable<Nomina[]> {
    return this.http.get<Nomina[]>(`${this.api}/worker/${trabajadorId}`);
  }
  obtener(id: number): Observable<Nomina> {
    return this.http.get<Nomina>(`${this.api}/${id}`);
  }
  generar(req: NominaRequest): Observable<Nomina> {
    return this.http.post<Nomina>(`${this.api}/generate`, req);
  }
  /** La nómina de todo el equipo (una semana): una por cada trabajador con jornales en el periodo */
  generarTodas(periodoInicio: string, periodoFin: string): Observable<Nomina[]> {
    return this.http.post<Nomina[]>(`${this.api}/generate-all`, { periodoInicio, periodoFin });
  }
  /** Corrige una nómina pendiente: le quita un jornal y recalcula */
  quitarJornal(id: number, jornalId: number): Observable<Nomina> {
    return this.http.delete<Nomina>(`${this.api}/${id}/workdays/${jornalId}`);
  }
  /** Suma los jornales de su periodo anotados después de generarla */
  traerJornalesNuevos(id: number): Observable<Nomina> {
    return this.http.post<Nomina>(`${this.api}/${id}/refresh`, {});
  }
  aprobarVarias(ids: number[]): Observable<Nomina[]> {
    return this.http.patch<Nomina[]>(`${this.api}/approve-batch`, { ids });
  }
  aprobar(id: number): Observable<Nomina> {
    return this.http.patch<Nomina>(`${this.api}/${id}/approve`, {});
  }
  anular(id: number): Observable<void> {
    return this.http.patch<void>(`${this.api}/${id}/void`, {});
  }
  reactivar(id: number): Observable<Nomina> {
    return this.http.patch<Nomina>(`${this.api}/${id}/reactivate`, {});
  }
  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }
}

@Injectable({ providedIn: 'root' })
export class JornalService {
  private api = `${environment.apiUrl}/api/workdays`;
  constructor(private http: HttpClient) {}

  registrar(req: JornalRequest): Observable<Jornal> {
    return this.http.post<Jornal>(this.api, req);
  }
  /** Kilos y costo del kilo por trabajador entre dos fechas ("2026-11-16"); sin fechas, los últimos 90 días */
  rendimiento(inicio?: string, fin?: string): Observable<RendimientoTrabajador[]> {
    let p = new HttpParams();
    if (inicio) p = p.set('inicio', inicio);
    if (fin) p = p.set('fin', fin);
    return this.http.get<RendimientoTrabajador[]>(`${this.api}/yield`, { params: p });
  }
  /** La cuadrícula trabajadores × días entre dos fechas ("2026-11-16") */
  planilla(inicio: string, fin: string): Observable<Planilla> {
    return this.http.get<Planilla>(`${this.api}/sheet`, {
      params: new HttpParams().set('inicio', inicio).set('fin', fin),
    });
  }
  registrarVarios(req: PlanillaRequest): Observable<Jornal[]> {
    return this.http.post<Jornal[]>(`${this.api}/batch`, req);
  }
  /** Quita un jornal que no está en ninguna nómina */
  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }
  cultivosDisponibles(): Observable<CultivoDisponible[]> {
    return this.http.get<CultivoDisponible[]>(`${this.api}/available-plantings`);
  }
  buscarPorId(id: number): Observable<Jornal> {
    return this.http.get<Jornal>(`${this.api}/${id}`);
  }
  /** Jornales del trabajador por páginas, más recientes primero. */
  paginaPorTrabajador(
    trabajadorId: number,
    page: number,
    inicio?: string,
    fin?: string,
    size = TAMANO_PAGINA,
  ): Observable<Pagina<Jornal>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (inicio) params = params.set('inicio', inicio);
    if (fin) params = params.set('fin', fin);
    return this.http.get<Pagina<Jornal>>(`${this.api}/worker/${trabajadorId}/page`, { params });
  }
  /** Jornales de todo el equipo (o de un trabajador si viene), por páginas, más recientes primero. */
  paginaEquipo(
    page: number,
    filtros: { trabajadorId?: number | null; inicio?: string; fin?: string } = {},
    size = TAMANO_PAGINA,
  ): Observable<Pagina<Jornal>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (filtros.trabajadorId != null) params = params.set('trabajadorId', filtros.trabajadorId);
    if (filtros.inicio) params = params.set('inicio', filtros.inicio);
    if (filtros.fin) params = params.set('fin', filtros.fin);
    return this.http.get<Pagina<Jornal>>(`${this.api}/page`, { params });
  }
  /** Totales con los mismos filtros */
  resumenEquipo(
    filtros: { trabajadorId?: number | null; inicio?: string; fin?: string } = {},
  ): Observable<ResumenJornales> {
    let params = new HttpParams();
    if (filtros.trabajadorId != null) params = params.set('trabajadorId', filtros.trabajadorId);
    if (filtros.inicio) params = params.set('inicio', filtros.inicio);
    if (filtros.fin) params = params.set('fin', filtros.fin);
    return this.http.get<ResumenJornales>(`${this.api}/summary`, { params });
  }
  /** Totales de los jornales del trabajador en el mismo rango de fechas. */
  resumenPorTrabajador(
    trabajadorId: number,
    inicio?: string,
    fin?: string,
  ): Observable<ResumenJornales> {
    let params = new HttpParams();
    if (inicio) params = params.set('inicio', inicio);
    if (fin) params = params.set('fin', fin);
    return this.http.get<ResumenJornales>(`${this.api}/worker/${trabajadorId}/summary`, { params });
  }
  /** Conteos de jornales para el Inicio en una sola consulta (hoy: "2026-11-16", la fecha del dispositivo). */
  resumenInicio(hoy: string): Observable<ResumenJornalesInicio> {
    return this.http.get<ResumenJornalesInicio>(`${this.api}/home-summary`, {
      params: new HttpParams().set('hoy', hoy),
    });
  }
  porTrabajador(trabajadorId: number, inicio?: string, fin?: string): Observable<Jornal[]> {
    let params = new HttpParams();
    if (inicio) params = params.set('inicio', inicio);
    if (fin) params = params.set('fin', fin);
    return this.http.get<Jornal[]>(`${this.api}/worker/${trabajadorId}`, { params });
  }
  porCultivo(cultivoId: number, inicio?: string, fin?: string): Observable<Jornal[]> {
    let params = new HttpParams();
    if (inicio) params = params.set('inicio', inicio);
    if (fin) params = params.set('fin', fin);
    return this.http.get<Jornal[]>(`${this.api}/planting/${cultivoId}`, { params });
  }
  agregarActividad(jornalId: number, actividadId: number): Observable<Jornal> {
    return this.http.patch<Jornal>(`${this.api}/${jornalId}/activities/${actividadId}`, {});
  }
  removerActividad(jornalId: number, actividadId: number): Observable<Jornal> {
    return this.http.delete<Jornal>(`${this.api}/${jornalId}/activities/${actividadId}`);
  }
}

@Injectable({ providedIn: 'root' })
export class PagoService {
  private api = `${environment.apiUrl}/api/payments`;
  constructor(private http: HttpClient) {}

  /** Pagos por páginas, más recientes primero. */
  pagina(
    page: number,
    nominaId?: number | null,
    size = TAMANO_PAGINA,
    trabajadorId?: number | null,
  ): Observable<Pagina<Pago>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (nominaId != null) params = params.set('nominaId', nominaId);
    if (trabajadorId != null) params = params.set('trabajadorId', trabajadorId);
    return this.http.get<Pagina<Pago>>(`${this.api}/page`, { params });
  }
  /** Totales de los pagos (con el mismo filtro de nómina), para las tarjetas de la lista. */
  resumen(nominaId?: number | null, trabajadorId?: number | null): Observable<ResumenPagos> {
    let params = new HttpParams();
    if (nominaId != null) params = params.set('nominaId', nominaId);
    if (trabajadorId != null) params = params.set('trabajadorId', trabajadorId);
    return this.http.get<ResumenPagos>(`${this.api}/summary`, { params });
  }
  /** Lo pagado cada mes desde una fecha ("2026-10-01"), para comparar un mes con el anterior. */
  porMes(desde: string): Observable<PagosDelMes[]> {
    return this.http.get<PagosDelMes[]>(`${this.api}/monthly`, {
      params: new HttpParams().set('since', desde),
    });
  }
  buscarPorId(id: number): Observable<Pago> {
    return this.http.get<Pago>(`${this.api}/${id}`);
  }
  historialPorTrabajador(trabajadorId: number): Observable<Pago[]> {
    return this.http.get<Pago[]>(`${this.api}/worker/${trabajadorId}`);
  }
  registrar(req: PagoRequest): Observable<Pago> {
    return this.http.post<Pago>(this.api, req);
  }
  /** Paga varias nóminas juntas, cada una por su total (aprobarPendientes: aprueba antes las pendientes) */
  pagarVarias(
    nominaIds: number[],
    metodoPago: string,
    aprobarPendientes = true,
    observaciones?: string,
  ): Observable<Pago[]> {
    return this.http.post<Pago[]>(`${this.api}/batch`, {
      nominaIds,
      metodoPago,
      aprobarPendientes,
      observaciones,
    });
  }
  /** Comprobante del pago en PDF, con un QR para verificarlo */
  comprobante(id: number): Observable<Blob> {
    return this.http.get(`${this.api}/${id}/receipt`, { responseType: 'blob' });
  }
}
