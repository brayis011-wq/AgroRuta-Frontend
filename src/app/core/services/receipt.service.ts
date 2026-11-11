import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/** Lo que el servidor muestra a quien escanea el QR de un comprobante de pago */
export interface ComprobanteVerificado {
  numero: string;
  fechaPago: string;
  monto: number;
  metodoPago: string | null;
  trabajador: string | null;
  /** Solo los últimos dígitos: "•••• 120" */
  cedula: string | null;
  empleador: string | null;
  periodoInicio: string | null;
  periodoFin: string | null;
}

@Injectable({ providedIn: 'root' })
export class ComprobanteService {
  private readonly http = inject(HttpClient);

  /** Pública: no necesita sesión. Responde 404 si el código no es el de ese pago. */
  verificar(pagoId: number, codigo: string): Observable<ComprobanteVerificado> {
    return this.http.get<ComprobanteVerificado>(`${environment.apiUrl}/api/public/receipts/${pagoId}`, {
      params: new HttpParams().set('code', codigo),
    });
  }
}
