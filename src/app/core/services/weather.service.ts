import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Weather } from '../models/weather.model';

@Injectable({ providedIn: 'root' })
export class WeatherService {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:8080/api/v1/weather';

  getByCity(city: string): Observable<Weather> {
    return this.http.get<Weather>(`${this.baseUrl}/city`, {
      params: { city }
    });
  }

  getByCoordinates(lat: number, lon: number): Observable<Weather> {
    return this.http.get<Weather>(`${this.baseUrl}/coordinates`, {
      params: { lat, lon }
    });
  }
}
