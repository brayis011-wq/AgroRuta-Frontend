import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * - no-soportado: el navegador no tiene avisos push (o la app no se abrió desde el build de producción)
 * - bloqueado: la persona negó el permiso en el navegador; solo ella puede volver a darlo
 */
export type EstadoPush = 'no-soportado' | 'bloqueado' | 'activo' | 'inactivo';

const aBase64Url = (bytes: ArrayBuffer | null): string => {
  if (!bytes) return '';
  let binario = '';
  new Uint8Array(bytes).forEach((b) => (binario += String.fromCharCode(b)));
  return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const deBase64Url = (texto: string): Uint8Array<ArrayBuffer> => {
  const relleno = '='.repeat((4 - (texto.length % 4)) % 4);
  const binario = atob((texto + relleno).replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = new Uint8Array(new ArrayBuffer(binario.length));
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return bytes;
};

/** Avisos push en este dispositivo: notificaciones que llegan aunque la app esté cerrada. */
@Injectable({ providedIn: 'root' })
export class AvisosPushService {
  private api = `${environment.apiUrl}/api/notifications/push`;

  constructor(private http: HttpClient) {}

  private get soportado(): boolean {
    return typeof navigator !== 'undefined' && 'serviceWorker' in navigator
      && typeof window !== 'undefined' && 'PushManager' in window && 'Notification' in window;
  }

  /** El service worker ya registrado (public/sw.js); null si la app corre sin él (ng serve) */
  private async registro(): Promise<ServiceWorkerRegistration | null> {
    if (!this.soportado) return null;
    return (await navigator.serviceWorker.getRegistration()) ?? null;
  }

  async estado(): Promise<EstadoPush> {
    try {
      const registro = await this.registro();
      if (!registro) return 'no-soportado';
      if (Notification.permission === 'denied') return 'bloqueado';
      return (await registro.pushManager.getSubscription()) ? 'activo' : 'inactivo';
    } catch {
      return 'no-soportado';
    }
  }

  /** Pide el permiso, suscribe este navegador y se lo cuenta al servidor. */
  async activar(): Promise<EstadoPush> {
    const registro = await this.registro();
    if (!registro) return 'no-soportado';
    const permiso = await Notification.requestPermission();
    if (permiso === 'denied') return 'bloqueado';
    if (permiso !== 'granted') return 'inactivo';

    const { clave } = await firstValueFrom(this.http.get<{ clave: string }>(`${this.api}/key`));
    let suscripcion = await registro.pushManager.getSubscription();
    // Una suscripción hecha con otra clave del servidor ya no sirve: se reemplaza
    if (suscripcion && aBase64Url(suscripcion.options.applicationServerKey) !== clave) {
      await suscripcion.unsubscribe();
      suscripcion = null;
    }
    suscripcion ??= await registro.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: deBase64Url(clave) });

    const datos = suscripcion.toJSON();
    try {
      await firstValueFrom(this.http.post<void>(`${this.api}/subscriptions`, {
        endpoint: datos.endpoint,
        p256dh: datos.keys?.['p256dh'],
        auth: datos.keys?.['auth'],
      }));
    } catch (e) {
      // El servidor no la aceptó: que el navegador no se quede suscrito a nada
      await suscripcion.unsubscribe().catch(() => undefined);
      throw e;
    }
    return 'activo';
  }

  async desactivar(): Promise<EstadoPush> {
    const registro = await this.registro();
    const suscripcion = await registro?.pushManager.getSubscription();
    if (!suscripcion) return 'inactivo';
    const endpoint = suscripcion.endpoint;
    await suscripcion.unsubscribe();
    // Si el aviso al servidor falla no importa: el próximo envío rebota y el servidor la borra solo
    await firstValueFrom(this.http.post<void>(`${this.api}/unsubscribe`, { endpoint })).catch(() => undefined);
    return 'inactivo';
  }

  /** Manda un aviso de prueba a los dispositivos de la cuenta. Devuelve a cuántos llegó. */
  async probar(): Promise<number> {
    const r = await firstValueFrom(this.http.post<{ enviados: number }>(`${this.api}/test`, {}));
    return r.enviados;
  }
}
