import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type BackupType = 'MANUAL' | 'AUTOMATIC' | 'PRE_RESTORE';

export interface Backup {
  name: string;
  sizeBytes: number;
  createdAt: string;
  type: BackupType;
}

@Injectable({ providedIn: 'root' })
export class BackupService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/backups`;

  list(): Observable<Backup[]> {
    return this.http.get<Backup[]>(this.apiUrl);
  }

  create(): Observable<Backup> {
    return this.http.post<Backup>(this.apiUrl, {});
  }

  download(name: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${encodeURIComponent(name)}/download`, {
      responseType: 'blob',
    });
  }

  restore(name: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${encodeURIComponent(name)}/restore`, {
      confirmacion: 'RESTAURAR',
    });
  }

  remove(name: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${encodeURIComponent(name)}`);
  }
}
