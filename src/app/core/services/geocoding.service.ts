import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { LanguageService } from './language.service';

export interface PuntoMapa {
  lat: number;
  lng: number;
}

interface NominatimLugar {
  lat: string;
  lon: string;
}

interface NominatimReverso {
  address?: Record<string, string | undefined>;
}

/**
 * Búsqueda de lugares con Nominatim (OpenStreetMap).
 * Antes cada componente llamaba fetch() por su cuenta y, si la red fallaba, no avisaba nada.
 */
@Injectable({ providedIn: 'root' })
export class GeocodingService {
  private readonly http = inject(HttpClient);
  private readonly lang = inject(LanguageService);
  private readonly base = 'https://nominatim.openstreetmap.org';

  /** Primer resultado para un texto, o null si no hay resultados o falla la red. */
  buscar(texto: string): Observable<PuntoMapa | null> {
    const params = new HttpParams()
      .set('q', texto.trim())
      .set('format', 'json')
      .set('limit', '1')
      .set('accept-language', this.lang.current());
    return this.http.get<NominatimLugar[]>(`${this.base}/search`, { params }).pipe(
      map((r) => (r?.length ? { lat: Number.parseFloat(r[0].lat), lng: Number.parseFloat(r[0].lon) } : null)),
      catchError(() => of(null)),
    );
  }

  /** "Vereda, Municipio, Departamento" para un punto, o null si no se encuentra. */
  direccion(punto: PuntoMapa): Observable<string | null> {
    const params = new HttpParams()
      .set('lat', String(punto.lat))
      .set('lon', String(punto.lng))
      .set('format', 'json')
      .set('accept-language', this.lang.current());
    return this.http.get<NominatimReverso>(`${this.base}/reverse`, { params }).pipe(
      map((r) => {
        const a = r?.address;
        if (!a) return null;
        const partes = [a['village'] || a['town'] || a['suburb'] || '', a['county'] || a['state_district'] || '', a['state'] || '']
          .filter(Boolean);
        return partes.length ? partes.join(', ') : null;
      }),
      catchError(() => of(null)),
    );
  }
}
