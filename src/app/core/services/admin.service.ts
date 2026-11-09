import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AgricultorAdmin,
  AgricultorDetalleAdmin,
  ResumenAdmin,
  RolUsuario,
  UsuarioAdmin,
} from '../models/admin.model';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/api/admin`;

  resumen(): Observable<ResumenAdmin> {
    return this.http.get<ResumenAdmin>(`${this.api}/summary`);
  }

  usuarios(): Observable<UsuarioAdmin[]> {
    return this.http.get<UsuarioAdmin[]>(`${this.api}/users`);
  }

  cambiarEstado(id: number, activo: boolean): Observable<UsuarioAdmin> {
    return this.http.patch<UsuarioAdmin>(`${this.api}/users/${id}/status`, { activo });
  }

  cambiarRol(id: number, rol: RolUsuario): Observable<UsuarioAdmin> {
    return this.http.patch<UsuarioAdmin>(`${this.api}/users/${id}/role`, { rol });
  }

  agricultores(): Observable<AgricultorAdmin[]> {
    return this.http.get<AgricultorAdmin[]>(`${this.api}/farmers`);
  }

  agricultor(id: number): Observable<AgricultorDetalleAdmin> {
    return this.http.get<AgricultorDetalleAdmin>(`${this.api}/farmers/${id}`);
  }
}
