import { Injectable, Injector, inject } from '@angular/core';
import { AuthService } from './auth.service';

/**
 * Lo último que se usó en cada formulario (el precio del kilo, la dosis de cada producto, la finca y
 * las labores del jornal), para que el siguiente registro empiece con eso. Se guarda en el navegador,
 * por cuenta; si no se puede guardar, los formularios simplemente empiezan vacíos.
 */
@Injectable({ providedIn: 'root' })
export class UltimoUsadoService {
  private readonly injector = inject(Injector);

  leer<T>(formulario: string): T | null {
    try {
      const v = localStorage.getItem(this.clave(formulario));
      return v ? (JSON.parse(v) as T) : null;
    } catch {
      return null;
    }
  }

  guardar<T>(formulario: string, valor: T): void {
    try { localStorage.setItem(this.clave(formulario), JSON.stringify(valor)); } catch { /* sin almacenamiento */ }
  }

  /** Mezcla con lo que ya había (para guardar por partes, p. ej. la dosis de cada producto) */
  mezclar<T extends object>(formulario: string, parte: Partial<T>): void {
    this.guardar(formulario, { ...(this.leer<T>(formulario) ?? {}), ...parte });
  }

  private clave(formulario: string): string {
    let id: number | null | undefined = null;
    try { id = this.injector.get(AuthService).getUsuario()?.id; } catch { /* sin sesión */ }
    return `ultimo:${id ?? 'anon'}:${formulario}`;
  }
}
