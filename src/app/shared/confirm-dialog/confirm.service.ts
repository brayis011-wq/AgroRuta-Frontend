import { Injectable, signal } from '@angular/core';

export interface OpcionesConfirmacion {
  /** Pregunta principal (ya traducida). */
  mensaje: string;
  /** Título opcional (ya traducido). Si falta se usa "¿Confirmar?". */
  titulo?: string;
  /** Texto del botón de confirmar (ya traducido). */
  confirmar?: string;
  /** Pinta el botón en rojo para acciones que borran o anulan. */
  peligro?: boolean;
}

interface Pendiente extends OpcionesConfirmacion {
  resolver: (respuesta: boolean) => void;
}

/**
 * Reemplaza a window.confirm() con un diálogo propio de la app:
 * se ve igual en todos los navegadores, se traduce y se puede probar.
 *
 *   if (!(await this.confirmService.preguntar({ mensaje }))) return;
 */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly pendiente = signal<Pendiente | null>(null);

  preguntar(opciones: OpcionesConfirmacion): Promise<boolean> {
    // Si había otra pregunta abierta, se cancela
    this.pendiente()?.resolver(false);
    return new Promise<boolean>((resolver) => this.pendiente.set({ ...opciones, resolver }));
  }

  responder(respuesta: boolean): void {
    const actual = this.pendiente();
    if (!actual) return;
    this.pendiente.set(null);
    actual.resolver(respuesta);
  }
}
