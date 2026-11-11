import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DiagnosticoPlaga, DiagnosticosSiembra } from '../models/diagnosis.model';

/** Diagnóstico de plagas y enfermedades con una foto, dentro de una siembra */
@Injectable({ providedIn: 'root' })
export class DiagnosticoService {
  private http = inject(HttpClient);

  private ruta(siembraId: number): string {
    return `${environment.apiUrl}/api/plantings/${siembraId}/diagnoses`;
  }

  listar(siembraId: number): Observable<DiagnosticosSiembra> {
    return this.http.get<DiagnosticosSiembra>(this.ruta(siembraId));
  }

  /** @param foto ya reducida (ver reducirFoto) */
  diagnosticar(siembraId: number, foto: Blob, nota: string): Observable<DiagnosticoPlaga> {
    const datos = new FormData();
    datos.append('foto', foto, 'foto.jpg');
    if (nota.trim()) datos.append('nota', nota.trim());
    return this.http.post<DiagnosticoPlaga>(this.ruta(siembraId), datos);
  }

  /** La foto va con la sesión de la persona, así que se pide aparte y no con un <img src> directo */
  foto(siembraId: number, diagnosticoId: number): Observable<Blob> {
    return this.http.get(`${this.ruta(siembraId)}/${diagnosticoId}/photo`, { responseType: 'blob' });
  }

  eliminar(siembraId: number, diagnosticoId: number): Observable<void> {
    return this.http.delete<void>(`${this.ruta(siembraId)}/${diagnosticoId}`);
  }
}
