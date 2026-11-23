import { Injectable, signal } from '@angular/core';

export interface Aviso {
  id: number;
  /** Clave de traducción del mensaje */
  clave: string;
  params?: Record<string, unknown>;
  /** Si viene, el aviso muestra "Deshacer" y esto se ejecuta al tocarlo */
  deshacer?: () => void;
}

/** Cuánto se queda el aviso en pantalla y cuánto dura su despedida */
export const AVISO_VISIBLE_MS = 2600;
export const AVISO_SALIDA_MS = 240;
/** Cuánto se puede deshacer un borrado */
export const DESHACER_MS = 6000;

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
  /** Cuándo quedó algo guardado en el dispositivo por falta de señal (ms) */
  private guardadoSinSenal = 0;

  /** La cola sin conexión avisa que acaba de guardar un registro en el dispositivo */
  marcarGuardadoSinSenal(): void {
    this.guardadoSinSenal = Date.now();
  }

  exito(clave: string, params?: Record<string, unknown>): void {
    // El formulario cree que guardó, pero quedó en el teléfono: se dice tal cual
    if (Date.now() - this.guardadoSinSenal < 3000) {
      this.guardadoSinSenal = 0;
      clave = 'offline.savedToast';
      params = undefined;
    }
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

  /** "Registro eliminado · Deshacer": se queda más tiempo y ofrece volver atrás */
  conDeshacer(clave: string, params: Record<string, unknown> | undefined, deshacer: () => void, ms = DESHACER_MS): void {
    this.parar();
    this.saliendo.set(false);
    this.actual.set({ id: ++this.serie, clave, params, deshacer });
    this.reloj = setTimeout(() => this.cerrar(), ms);
  }

  /** Tocar "Deshacer" */
  deshacerActual(): void {
    const a = this.actual();
    a?.deshacer?.();
    this.cerrar();
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
