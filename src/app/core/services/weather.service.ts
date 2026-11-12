import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConsejoClima, Weather } from '../models/weather.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class WeatherService {
  private http = inject(HttpClient);
private baseUrl = `${environment.apiUrl}/api/weather`;
  getByCity(city: string): Observable<Weather> {
    return this.http.get<Weather>(`${this.baseUrl}/city`, {
      params: { city }
    });
  }

  /** Lo que el pronóstico cambia en lo programado para hoy y mañana (lo más urgente primero) */
  consejos(): Observable<ConsejoClima[]> {
    return this.http.get<ConsejoClima[]>(`${this.baseUrl}/advice`);
  }

  getByCoordinates(lat: number, lon: number): Observable<Weather> {
    return this.http.get<Weather>(`${this.baseUrl}/coordinates`, {
      params: { lat, lon }
    });
  }
}
