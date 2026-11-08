import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MeasurementUnit } from '../models/AgriculturalInput.model';
import {
  AjusteRequest, CompraRequest, CostoEstimado, MovimientoInventario, StockInsumo,
} from '../models/inventario.model';

/** Bodega de insumos del usuario (una por agricultor) */
@Injectable({ providedIn: 'root' })
export class InventarioService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/api/inventario`;

  stock(): Observable<StockInsumo[]> {
    return this.http.get<StockInsumo[]>(this.api);
  }

  /** Insumos bajos, agotados o en negativo */
  avisos(): Observable<StockInsumo[]> {
    return this.http.get<StockInsumo[]>(`${this.api}/avisos`);
  }

  movimientos(insumoId: number): Observable<MovimientoInventario[]> {
    return this.http.get<MovimientoInventario[]>(`${this.api}/${insumoId}/movimientos`);
  }

  registrarCompra(req: CompraRequest): Observable<MovimientoInventario> {
    return this.http.post<MovimientoInventario>(`${this.api}/compras`, req);
  }

  ajustar(req: AjusteRequest): Observable<MovimientoInventario> {
    return this.http.post<MovimientoInventario>(`${this.api}/ajustes`, req);
  }

  /** minimo = null quita el aviso */
  definirMinimo(insumoId: number, minimo: number | null, unidad: MeasurementUnit): Observable<StockInsumo> {
    return this.http.put<StockInsumo>(`${this.api}/${insumoId}/minimo`, { minimo, unidad });
  }

  eliminarMovimiento(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/movimientos/${id}`);
  }

  costoEstimado(insumoId: number, cantidad: number, unidad: MeasurementUnit): Observable<CostoEstimado> {
    const params = new HttpParams().set('insumoId', insumoId).set('cantidad', cantidad).set('unidad', unidad);
    return this.http.get<CostoEstimado>(`${this.api}/costo-estimado`, { params });
  }
}
