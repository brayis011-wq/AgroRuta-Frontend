import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  EstadoPrecios,
  KilosEnBodega,
  Abono, GastoFinca, LaborProgramada, LaborProgramadaRequest, MetodoCobro, PrecioCultivo, PrecioReferencia,
  PreferenciaPrecio, Presupuesto, ResumenGastos, ResumenLluvia, ResumenVentas, Venta, VentaRequest, EstadoVenta,
} from '../models/finance.model';

/** Solo las fechas que vienen */
function rango(desde?: string | null, hasta?: string | null, extra: Record<string, string | number> = {}): HttpParams {
  let p = new HttpParams();
  for (const [k, v] of Object.entries(extra)) p = p.set(k, v);
  if (desde) p = p.set('desde', desde);
  if (hasta) p = p.set('hasta', hasta);
  return p;
}

/** Precio de referencia de lo cosechado (SIPSA o el precio propio de cada cultivo) */
@Injectable({ providedIn: 'root' })
export class PreciosService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api/reference-prices`;

  deCultivo(cultivo: string, variedad?: string | null): Observable<PrecioCultivo> {
    let p = new HttpParams().set('crop', cultivo);
    if (variedad) p = p.set('variety', variedad);
    return this.http.get<PrecioCultivo>(`${this.api}/crop`, { params: p });
  }
  buscar(q: string): Observable<PrecioReferencia[]> {
    return this.http.get<PrecioReferencia[]>(this.api, { params: new HttpParams().set('q', q) });
  }
  /** Si ya hay precios de SIPSA, si se están trayendo y por qué falló la última vez */
  estado(): Observable<EstadoPrecios> { return this.http.get<EstadoPrecios>(`${this.api}/status`); }
  mias(): Observable<PreferenciaPrecio[]> { return this.http.get<PreferenciaPrecio[]>(`${this.api}/mine`); }
  elegir(cultivo: string, producto: string | null, precioKg: number | null): Observable<PreferenciaPrecio> {
    return this.http.put<PreferenciaPrecio>(`${this.api}/mine`, { cultivo, producto, precioKg });
  }
  quitar(cultivo: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/mine`, { params: new HttpParams().set('crop', cultivo) });
  }
}

/** Gastos generales de las fincas */
@Injectable({ providedIn: 'root' })
export class GastosService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api/farm-expenses`;

  listar(fincaId?: number | null, desde?: string | null, hasta?: string | null): Observable<GastoFinca[]> {
    return this.http.get<GastoFinca[]>(this.api, { params: rango(desde, hasta, fincaId ? { farmId: fincaId } : {}) });
  }
  resumen(desde?: string | null, hasta?: string | null): Observable<ResumenGastos> {
    return this.http.get<ResumenGastos>(`${this.api}/summary`, { params: rango(desde, hasta) });
  }
  crear(g: GastoFinca): Observable<GastoFinca> { return this.http.post<GastoFinca>(this.api, g); }
  actualizar(id: number, g: GastoFinca): Observable<GastoFinca> { return this.http.put<GastoFinca>(`${this.api}/${id}`, g); }
  eliminar(id: number): Observable<void> { return this.http.delete<void>(`${this.api}/${id}`); }
}

/** Ventas y cuentas por cobrar */
@Injectable({ providedIn: 'root' })
export class VentasService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api/sales`;

  listar(estado?: EstadoVenta | null, comprador?: string | null): Observable<Venta[]> {
    let p = new HttpParams();
    if (estado) p = p.set('status', estado);
    if (comprador) p = p.set('buyer', comprador);
    return this.http.get<Venta[]>(this.api, { params: p });
  }
  resumen(): Observable<ResumenVentas> { return this.http.get<ResumenVentas>(`${this.api}/summary`); }
  compradores(): Observable<string[]> { return this.http.get<string[]>(`${this.api}/buyers`); }
  /** Lo cosechado menos lo vendido de cada siembra */
  kilosEnBodega(): Observable<KilosEnBodega[]> { return this.http.get<KilosEnBodega[]>(`${this.api}/harvest-stock`); }
  obtener(id: number): Observable<Venta> { return this.http.get<Venta>(`${this.api}/${id}`); }
  crear(v: VentaRequest): Observable<Venta> { return this.http.post<Venta>(this.api, v); }
  actualizar(id: number, v: VentaRequest): Observable<Venta> { return this.http.put<Venta>(`${this.api}/${id}`, v); }
  eliminar(id: number): Observable<void> { return this.http.delete<void>(`${this.api}/${id}`); }
  abonar(id: number, a: { fecha: string; monto: number; metodo: MetodoCobro; observaciones?: string | null }): Observable<Venta> {
    return this.http.post<Venta>(`${this.api}/${id}/payments`, a);
  }
  quitarAbono(id: number, abono: Abono): Observable<Venta> {
    return this.http.delete<Venta>(`${this.api}/${id}/payments/${abono.id}`);
  }
}

/** Datos del campo: lluvia por finca, labores que se repiten y presupuesto de cada temporada */
@Injectable({ providedIn: 'root' })
export class CampoService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api`;

  lluvia(fincaId: number, desde?: string | null, hasta?: string | null): Observable<ResumenLluvia> {
    return this.http.get<ResumenLluvia>(`${this.api}/farms/${fincaId}/rain`, { params: rango(desde, hasta) });
  }
  anotarLluvia(fincaId: number, fecha: string, milimetros: number): Observable<unknown> {
    return this.http.put(`${this.api}/farms/${fincaId}/rain/${fecha}`, { milimetros });
  }
  borrarLluvia(fincaId: number, fecha: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/farms/${fincaId}/rain/${fecha}`);
  }

  programadas(siembraId: number): Observable<LaborProgramada[]> {
    return this.http.get<LaborProgramada[]>(`${this.api}/plantings/${siembraId}/recurring`);
  }
  crearProgramada(siembraId: number, r: LaborProgramadaRequest): Observable<LaborProgramada> {
    return this.http.post<LaborProgramada>(`${this.api}/plantings/${siembraId}/recurring`, r);
  }
  actualizarProgramada(id: number, r: LaborProgramadaRequest): Observable<LaborProgramada> {
    return this.http.put<LaborProgramada>(`${this.api}/recurring-activities/${id}`, r);
  }
  eliminarProgramada(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/recurring-activities/${id}`);
  }

  /** null si la temporada no tiene presupuesto (el backend responde 204) */
  presupuesto(siembraId: number): Observable<Presupuesto | null> {
    return this.http.get<Presupuesto | null>(`${this.api}/plantings/${siembraId}/budget`);
  }
  guardarPresupuesto(siembraId: number, p: { manoObra: number | null; insumos: number | null; otros: number | null }): Observable<Presupuesto> {
    return this.http.put<Presupuesto>(`${this.api}/plantings/${siembraId}/budget`, p);
  }
  borrarPresupuesto(siembraId: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/plantings/${siembraId}/budget`);
  }
}
