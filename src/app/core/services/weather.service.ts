import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Weather } from '../models/weather.model';
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

  getByCoordinates(lat: number, lon: number): Observable<Weather> {
    return this.http.get<Weather>(`${this.baseUrl}/coordinates`, {
      params: { lat, lon }
    });
  }
}
