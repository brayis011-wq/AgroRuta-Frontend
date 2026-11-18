import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export type TipoAviso = 'PAGO_REGISTRADO' | 'ACCESO_SOLICITADO' | 'ACCESO_RESUELTO' | 'RESUMEN_DIA';

/** Un aviso de la campana (GET /api/notifications/inbox) */
export interface AvisoBandeja {
  id: number;
  /** null si el servidor tiene un tipo que esta versión de la app no conoce: se usan titulo y cuerpo */
  tipo: TipoAviso | null;
  /** Texto en español que arma el servidor (se usa si no hay traducción para el tipo) */
  titulo: string;
  cuerpo: string;
  datos: Record<string, unknown>;
  ruta: string | null;
  /** ISO en UTC */
  creadoEn: string;
  leido: boolean;
}

interface RespuestaBandeja {
  noLeidos: number;
  avisos: AvisoBandeja[];
}

/** Cada cuánto se pregunta si hay avisos nuevos mientras la pestaña está a la vista */
export const CADA_CUANTO_MS = 2 * 60_000;

/**
 * La bandeja de avisos de quien inició sesión. La comparten las campanas del menú y de la barra del celular.
 * Pregunta por el número de no leídos cada dos minutos, solo con la pestaña a la vista.
 */
@Injectable({ providedIn: 'root' })
export class BandejaAvisosService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/notifications/inbox`;

  readonly noLeidos = signal(0);
  /** null mientras no se ha cargado la lista */
  readonly avisos = signal<AvisoBandeja[] | null>(null);
  readonly error = signal(false);

  private usuarios = 0;
  private reloj: ReturnType<typeof setInterval> | null = null;
  private readonly alVolver = () => { if (document.visibilityState === 'visible') this.refrescarConteo(); };

  /** Lo llama cada campana al aparecer; la consulta periódica corre mientras haya al menos una */
  iniciar(): void {
    if (this.usuarios++ > 0) return;
    this.refrescarConteo();
    this.reloj = setInterval(() => { if (document.visibilityState === 'visible') this.refrescarConteo(); }, CADA_CUANTO_MS);
    document.addEventListener('visibilitychange', this.alVolver);
  }

  detener(): void {
    if (--this.usuarios > 0) return;
    this.usuarios = 0;
    if (this.reloj) clearInterval(this.reloj);
    this.reloj = null;
    document.removeEventListener('visibilitychange', this.alVolver);
    // Al cerrar sesión no deben quedar los avisos de esta persona para la siguiente
    this.noLeidos.set(0);
    this.avisos.set(null);
  }

  refrescarConteo(): void {
    this.http.get<{ noLeidos: number }>(`${this.base}/unread-count`).subscribe({
      next: (r) => this.noLeidos.set(r.noLeidos ?? 0),
      error: () => { /* sin conexión o servidor dormido: se intenta en la próxima vuelta */ },
    });
  }

  cargar(): void {
    this.error.set(false);
    this.http.get<RespuestaBandeja>(this.base).subscribe({
      next: (r) => {
        this.avisos.set(r.avisos ?? []);
        this.noLeidos.set(r.noLeidos ?? 0);
      },
      error: () => {
        this.error.set(true);
        if (this.avisos() === null) this.avisos.set([]);
      },
    });
  }

  /** Se marca enseguida en pantalla; si el servidor falla, se vuelve a leer la bandeja */
  marcarLeido(aviso: AvisoBandeja): void {
    if (aviso.leido) return;
    this.avisos.update((l) => l?.map((a) => (a.id === aviso.id ? { ...a, leido: true } : a)) ?? l);
    this.noLeidos.update((n) => Math.max(0, n - 1));
    this.http.patch<void>(`${this.base}/${aviso.id}/read`, null).subscribe({ error: () => this.cargar() });
  }

  marcarTodos(): void {
    if (this.noLeidos() === 0) return;
    this.avisos.update((l) => l?.map((a) => ({ ...a, leido: true })) ?? l);
    this.noLeidos.set(0);
    this.http.post<void>(`${this.base}/read-all`, null).subscribe({ error: () => this.cargar() });
  }
}
