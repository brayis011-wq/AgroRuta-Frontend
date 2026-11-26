import { Injectable, Injector, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';

/** Algo que se visitó hace poco: una siembra, un lote, una finca o los jornales de un trabajador */
export interface Reciente {
  tipo: 'planting' | 'plot' | 'farm' | 'worker';
  titulo: string;
  detalle?: string;
  ruta: string;
  query?: Record<string, string | number>;
}

/** Cuántos se recuerdan */
export const MAX_RECIENTES = 6;

/**
 * "Seguir donde iba": lo último que se abrió, en este dispositivo y por cuenta. Se guarda en el
 * navegador (no viaja al servidor); si el navegador no deja guardar, simplemente no se recuerda.
 */
@Injectable({ providedIn: 'root' })
export class RecientesService {
  // Se pide al guardar (no al crearse) para no arrastrar la sesión a pantallas que no la necesitan
  private readonly injector = inject(Injector);
  readonly lista = signal<Reciente[]>(this.leer());

  /** Lo pone de primero (si ya estaba, lo mueve) */
  anotar(r: Reciente): void {
    if (!r.titulo || !r.ruta) return;
    const misma = (x: Reciente) =>
      x.ruta === r.ruta && JSON.stringify(x.query ?? {}) === JSON.stringify(r.query ?? {});
    const nueva = [r, ...this.leer().filter((x) => !misma(x))].slice(0, MAX_RECIENTES);
    this.lista.set(nueva);
    try {
      localStorage.setItem(this.clave(), JSON.stringify(nueva));
    } catch {
      /* sin almacenamiento */
    }
  }

  /** Vuelve a leer (al cambiar de cuenta en el mismo navegador) */
  refrescar(): void {
    this.lista.set(this.leer());
  }

  private leer(): Reciente[] {
    try {
      const v = JSON.parse(localStorage.getItem(this.clave()) ?? '[]');
      return Array.isArray(v)
        ? v.filter((x) => x && typeof x.ruta === 'string' && typeof x.titulo === 'string')
        : [];
    } catch {
      return [];
    }
  }

  private clave(): string {
    let id: number | null | undefined = null;
    try {
      id = this.injector.get(AuthService).getUsuario()?.id;
    } catch {
      /* sin sesión */
    }
    return `recientes:${id ?? 'anon'}`;
  }
}
