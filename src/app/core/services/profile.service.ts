import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Perfil, UpdateProfileRequest, ChangePasswordRequest } from '../models/profile.model';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly base = 'http://localhost:8080/api/configuration';

  constructor(private http: HttpClient) {}

  getPerfil(): Observable<Perfil> {
    return this.http.get<Perfil>(`${this.base}/perfil`);
  }

  updatePerfil(data: UpdateProfileRequest): Observable<Perfil> {
    return this.http.put<Perfil>(`${this.base}/perfil`, data);
  }

  changePassword(data: ChangePasswordRequest): Observable<void> {
    return this.http.patch<void>(`${this.base}/perfil/password`, data);
  }
}
