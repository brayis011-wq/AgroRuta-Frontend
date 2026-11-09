import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MeasurementUnit } from '../models/agricultural-input.model';
import {
  AjusteRequest, CompraRequest, CostoEstimado, MovimientoInventario, StockInsumo,
} from '../models/inventory.model';

/** Bodega de insumos del usuario (una por agricultor) */
@Injectable({ providedIn: 'root' })
export class InventarioService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/api/inventory`;

  stock(): Observable<StockInsumo[]> {
    return this.http.get<StockInsumo[]>(this.api);
  }

  /** Insumos bajos, agotados o en negativo */
  avisos(): Observable<StockInsumo[]> {
    return this.http.get<StockInsumo[]>(`${this.api}/alerts`);
  }

  movimientos(insumoId: number): Observable<MovimientoInventario[]> {
    return this.http.get<MovimientoInventario[]>(`${this.api}/${insumoId}/movements`);
  }

  registrarCompra(req: CompraRequest): Observable<MovimientoInventario> {
    return this.http.post<MovimientoInventario>(`${this.api}/purchases`, req);
  }

  ajustar(req: AjusteRequest): Observable<MovimientoInventario> {
    return this.http.post<MovimientoInventario>(`${this.api}/adjustments`, req);
  }

  /** minimo = null quita el aviso */
  definirMinimo(insumoId: number, minimo: number | null, unidad: MeasurementUnit): Observable<StockInsumo> {
    return this.http.put<StockInsumo>(`${this.api}/${insumoId}/minimum`, { minimo, unidad });
  }

  eliminarMovimiento(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/movements/${id}`);
  }

  costoEstimado(insumoId: number, cantidad: number, unidad: MeasurementUnit): Observable<CostoEstimado> {
    const params = new HttpParams().set('insumoId', insumoId).set('cantidad', cantidad).set('unidad', unidad);
    return this.http.get<CostoEstimado>(`${this.api}/estimated-cost`, { params });
  }
}
