import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpContext, HttpContextToken, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { AlmacenSinConexion, Lectura, Pendiente, TipoPendiente } from './offline-store';

/** Cabecera con la clave del envío: el servidor rechaza la segunda vez que llega la misma (409 AGR-036) */
export const CABECERA_ENVIO = 'X-Idempotency-Key';
/** Marca las peticiones del reenvío para que el interceptor no las vuelva a meter en la cola */
export const SIN_COLA = new HttpContextToken<boolean>(() => false);

const YA_RECIBIDO = 'AGR-036';
/** Consultas más grandes que esto no se guardan (fotos en base64, listados enormes) */
const MAX_CARACTERES = 400_000;
const CADA_MS = 60_000;

/**
 * Trabajo sin conexión: guarda en el dispositivo lo que se registra sin señal y lo envía al volver,
 * y conserva una copia de las consultas para poder llenar los formularios sin internet.
 */
@Injectable({ providedIn: 'root' })
export class ColaSinConexionService {
  private almacen = inject(AlmacenSinConexion);
  private auth = inject(AuthService);
  private http = inject(HttpClient);

  /** navigator.onLine en false es confiable; en true solo dice que hay red, no que haya internet */
  readonly enLinea = signal(typeof navigator === 'undefined' || navigator.onLine !== false);
  /** Registros de la persona con sesión que aún no llegan al servidor */
  readonly pendientes = signal<Pendiente[]>([]);
  readonly sincronizando = signal(false);
  /** Cuántos registros se enviaron en la última sincronización (para avisar) */
  readonly enviados = signal(0);
  /** Sube cada vez que algo queda guardado en el dispositivo (para avisar) */
  readonly guardados = signal(0);
  /** Fecha de la copia que se está mostrando porque no hubo red; null si lo último vino del servidor */
  readonly copiaDesde = signal<string | null>(null);

  readonly porEnviar = computed(() => this.pendientes().filter((p) => !p.error).length);
  readonly conError = computed(() => this.pendientes().filter((p) => !!p.error).length);

  private iniciado = false;

  /** Empieza a vigilar la conexión. Lo llama el indicador del menú, una sola vez. */
  iniciar(): void {
    if (this.iniciado || typeof window === 'undefined') return;
    this.iniciado = true;
    window.addEventListener('online', () => {
      this.enLinea.set(true);
      void this.sincronizar();
    });
    window.addEventListener('offline', () => this.enLinea.set(false));
    // "online" no siempre avisa (redes con portal, servidor dormido): se reintenta cada minuto
    setInterval(() => {
      if (this.porEnviar() > 0 && this.enLinea()) void this.sincronizar();
    }, CADA_MS);
    void this.refrescar().then(() => this.sincronizar());
  }

  private usuarioId(): number | null {
    return this.auth.getUsuario()?.id ?? null;
  }

  async refrescar(): Promise<void> {
    const uid = this.usuarioId();
    try {
      this.pendientes.set(uid == null ? [] : await this.almacen.pendientes(uid));
    } catch {
      this.pendientes.set([]);
    }
  }

  // ───────────── Copia de las consultas ─────────────

  /** Guarda la respuesta de una consulta. Nunca falla: es una ayuda, no parte de la petición. */
  guardarLectura(url: string, valor: unknown): void {
    const uid = this.usuarioId();
    this.copiaDesde.set(null);
    if (uid == null || valor == null) return;
    try {
      if (JSON.stringify(valor).length > MAX_CARACTERES) return;
    } catch {
      return;
    }
    void this.almacen.guardarLectura(`${uid}|${url}`, valor).catch(() => undefined);
  }

  /** La última copia de esa consulta para la persona con sesión, o null. */
  async leerLectura(url: string): Promise<Lectura | null> {
    const uid = this.usuarioId();
    if (uid == null) return null;
    try {
      const copia = await this.almacen.leerLectura(`${uid}|${url}`);
      if (copia) this.copiaDesde.set(copia.guardadoEn);
      return copia;
    } catch {
      return null;
    }
  }

  // ───────────── Registros por enviar ─────────────

  /** Guarda un registro en el dispositivo. Falla si no hay sesión o el navegador no deja guardar. */
  async encolar(tipo: TipoPendiente, url: string, cuerpo: unknown, id: string): Promise<void> {
    const uid = this.usuarioId();
    if (uid == null) throw new Error('sin sesión');
    await this.almacen.guardarPendiente({ id, usuarioId: uid, tipo, url, cuerpo, creadoEn: new Date().toISOString() });
    await this.refrescar();
    this.guardados.update((n) => n + 1);
  }

  async descartar(id: string): Promise<void> {
    await this.almacen.quitarPendiente(id).catch(() => undefined);
    await this.refrescar();
  }

  /** Vuelve a intentar un registro rechazado, opcionalmente con cambios (p. ej. confirmar la carencia). */
  async reintentar(id: string, cambios?: Record<string, unknown>): Promise<void> {
    const p = this.pendientes().find((x) => x.id === id);
    if (!p) return;
    const { error: _e, codigoError: _c, ...limpio } = p;
    const cuerpo = cambios && typeof p.cuerpo === 'object' && p.cuerpo !== null ? { ...p.cuerpo, ...cambios } : p.cuerpo;
    await this.almacen.guardarPendiente({ ...limpio, cuerpo });
    await this.refrescar();
    await this.sincronizar();
  }

  /** Envía lo pendiente, en orden. Solo una pestaña a la vez. */
  async sincronizar(): Promise<void> {
    if (this.sincronizando() || this.usuarioId() == null) return;
    const candados = typeof navigator !== 'undefined' ? navigator.locks : undefined;
    if (candados?.request) {
      await candados.request('agroruta-sincronizar', { ifAvailable: true }, (candado) => (candado ? this.enviarTodo() : undefined));
    } else {
      await this.enviarTodo();
    }
  }

  private async enviarTodo(): Promise<void> {
    const uid = this.usuarioId();
    if (uid == null || this.sincronizando()) return;
    this.sincronizando.set(true);
    let enviados = 0;
    try {
      const cola = (await this.almacen.pendientes(uid)).filter((p) => !p.error);
      for (const p of cola) {
        try {
          await firstValueFrom(
            this.http.post(p.url, p.cuerpo, {
              headers: { [CABECERA_ENVIO]: p.id },
              context: new HttpContext().set(SIN_COLA, true),
            }),
          );
          await this.almacen.quitarPendiente(p.id);
          enviados++;
        } catch (e) {
          const err = e as HttpErrorResponse;
          if (err.status === 409 && err.error?.errorCode === YA_RECIBIDO) {
            // Ya había llegado en un intento anterior: solo se perdió la respuesta
            await this.almacen.quitarPendiente(p.id);
            enviados++;
            continue;
          }
          const transitorio = !err.status || err.status === 401 || err.status === 408 || err.status === 429 || err.status >= 500;
          if (transitorio) break;
          // Regla de negocio (422, 404, 409...): se queda hasta que la persona decida
          await this.almacen.guardarPendiente({
            ...p,
            error: err.error?.message || 'offline.rejected',
            codigoError: err.error?.errorCode,
          });
        }
      }
    } catch {
      // No se pudo leer la cola: se intenta en la próxima vuelta
    } finally {
      await this.refrescar();
      this.sincronizando.set(false);
      if (enviados > 0) this.enviados.set(enviados);
    }
  }
}
