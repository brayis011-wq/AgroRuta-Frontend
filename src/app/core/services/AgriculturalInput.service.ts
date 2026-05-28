// src/app/core/services/agricultural-input.service.ts

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';          // ← 3 niveles: services→core→app→src/environments
import { AgriculturalInput, AgriculturalInputRequest } from '../models/AgriculturalInput.model'; // ← modelo en core/models

@Injectable({ providedIn: 'root' })
export class AgriculturalInputService {
  private readonly http    = inject(HttpClient);
private readonly baseUrl = `${environment.apiUrl}/api/agricultural-inputs`;
  getAll(): Observable<AgriculturalInput[]> {
    return this.http.get<AgriculturalInput[]>(this.baseUrl);
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
