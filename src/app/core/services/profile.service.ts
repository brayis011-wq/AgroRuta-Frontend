import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Perfil, UpdateProfileRequest, ChangePasswordRequest } from '../models/profile.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly base = `${environment.apiUrl}/api/configuration`;
  /** Foto de la cuenta que inició sesión, para el menú lateral (null = sin foto o sin cargar) */
  readonly foto = signal<string | null>(null);
  private fotoCargada = false;

  constructor(private http: HttpClient) {}

  getPerfil(): Observable<Perfil> {
    return this.http.get<Perfil>(`${this.base}/perfil`).pipe(tap((p) => this.recordarFoto(p)));
  }

  updatePerfil(data: UpdateProfileRequest): Observable<Perfil> {
    return this.http.put<Perfil>(`${this.base}/perfil`, data).pipe(tap((p) => this.recordarFoto(p)));
  }

  /** Carga la foto una sola vez por sesión (el menú la pide al abrirse) */
  cargarFoto(): void {
    if (this.fotoCargada) return;
    this.fotoCargada = true;
    this.getPerfil().subscribe({ error: () => (this.fotoCargada = false) });
  }

  /** Al cerrar sesión, para que la siguiente cuenta no vea la foto anterior */
  olvidarFoto(): void {
    this.foto.set(null);
    this.fotoCargada = false;
  }

  private recordarFoto(p: Perfil | null | undefined): void {
    this.foto.set(p?.fotoPerfil || null);
    this.fotoCargada = true;
  }

  changePassword(data: ChangePasswordRequest): Observable<void> {
    return this.http.patch<void>(`${this.base}/perfil/password`, data);
  }
}
