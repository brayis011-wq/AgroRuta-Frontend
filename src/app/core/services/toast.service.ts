import { Injectable, signal } from '@angular/core';

export interface Aviso {
  id: number;
  /** Clave de traducción del mensaje */
  clave: string;
  params?: Record<string, unknown>;
}

/** Cuánto se queda el aviso en pantalla y cuánto dura su despedida */
export const AVISO_VISIBLE_MS = 2600;
export const AVISO_SALIDA_MS = 240;

/**
 * Aviso pasajero de "quedó guardado". Vive fuera de las pantallas (lo pinta el panel), así que
 * sigue visible aunque el formulario navegue enseguida a otra página.
 */
@Injectable({ providedIn: 'root' })
export class AvisosService {
  readonly actual = signal<Aviso | null>(null);
  readonly saliendo = signal(false);
  private serie = 0;
  private reloj: ReturnType<typeof setTimeout> | null = null;

  exito(clave: string, params?: Record<string, unknown>): void {
    this.parar();
    this.saliendo.set(false);
    this.actual.set({ id: ++this.serie, clave, params });
    // Un toque corto en el celular, donde el navegador lo permite
    try {
      navigator.vibrate?.(12);
    } catch {
      // sin vibración
    }
    this.reloj = setTimeout(() => this.cerrar(), AVISO_VISIBLE_MS);
  }

  cerrar(): void {
    if (!this.actual() || this.saliendo()) return;
    this.parar();
    this.saliendo.set(true);
    this.reloj = setTimeout(() => {
      this.reloj = null;
      this.saliendo.set(false);
      this.actual.set(null);
    }, AVISO_SALIDA_MS);
  }

  private parar(): void {
    if (this.reloj) clearTimeout(this.reloj);
    this.reloj = null;
  }
}
