// src/app/core/services/agricultural-input.service.ts

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';          // ← 3 niveles: services→core→app→src/environments
import { AgriculturalInput, AgriculturalInputRequest } from '../models/agricultural-input.model'; // ← modelo en core/models

@Injectable({ providedIn: 'root' })
export class AgriculturalInputService {
  private readonly http    = inject(HttpClient);
private readonly baseUrl = `${environment.apiUrl}/api/agricultural-inputs`;
  getAll(): Observable<AgriculturalInput[]> {
    return this.http.get<AgriculturalInput[]>(this.baseUrl);
  }

  /** Administrador: el catálogo completo, también los desactivados. */
  getAllAdmin(): Observable<AgriculturalInput[]> {
    return this.http.get<AgriculturalInput[]>(`${this.baseUrl}/all`);
  }

  /** Administrador: activa o desactiva un insumo (no se borra nada). */
  changeStatus(id: number, activo: boolean): Observable<AgriculturalInput> {
    return this.http.patch<AgriculturalInput>(`${this.baseUrl}/${id}/status`, null, {
      params: new HttpParams().set('activo', activo),
    });
  }

  search(query: string): Observable<AgriculturalInput[]> {
    const params = new HttpParams().set('q', query);
    return this.http.get<AgriculturalInput[]>(this.baseUrl, { params });
  }

  getById(id: number): Observable<AgriculturalInput> {
    return this.http.get<AgriculturalInput>(`${this.baseUrl}/${id}`);
  }

  create(request: AgriculturalInputRequest): Observable<AgriculturalInput> {
    return this.http.post<AgriculturalInput>(this.baseUrl, request);
  }

  update(id: number, request: AgriculturalInputRequest): Observable<AgriculturalInput> {
    return this.http.put<AgriculturalInput>(`${this.baseUrl}/${id}`, request);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
