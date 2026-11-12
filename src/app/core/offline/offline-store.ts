import { Injectable } from '@angular/core';

/** Qué clase de registro quedó guardado en el dispositivo */
export type TipoPendiente = 'jornal' | 'fumigacion' | 'cosecha' | 'actividad';

/** Un registro hecho sin conexión que todavía no llega al servidor */
export interface Pendiente {
  /** Clave única del envío: el servidor la usa para no guardar dos veces el mismo registro */
  id: string;
  usuarioId: number;
  tipo: TipoPendiente;
  url: string;
  cuerpo: unknown;
  /** ISO */
  creadoEn: string;
  /** El servidor lo rechazó (regla de negocio): espera a que la persona decida qué hacer */
  error?: string;
  codigoError?: string;
}

/** Copia de una consulta, para mostrarla cuando no hay señal */
export interface Lectura {
  valor: unknown;
  /** ISO */
  guardadoEn: string;
}

/**
 * Lo que la app guarda en el dispositivo para trabajar sin conexión.
 * En el navegador vive en IndexedDB; en las pruebas (o si el navegador no lo permite), en memoria.
 */
@Injectable({
  providedIn: 'root',
  useFactory: () => (typeof indexedDB !== 'undefined' ? new AlmacenIndexedDb() : new AlmacenEnMemoria()),
})
export abstract class AlmacenSinConexion {
  abstract guardarLectura(clave: string, valor: unknown): Promise<void>;
  abstract leerLectura(clave: string): Promise<Lectura | null>;
  abstract borrarLecturas(): Promise<void>;
  abstract guardarPendiente(p: Pendiente): Promise<void>;
  abstract pendientes(usuarioId: number): Promise<Pendiente[]>;
  abstract quitarPendiente(id: string): Promise<void>;
}

const porFecha = (a: Pendiente, b: Pendiente) => a.creadoEn.localeCompare(b.creadoEn);

export class AlmacenEnMemoria extends AlmacenSinConexion {
  private lecturas = new Map<string, Lectura>();
  private cola = new Map<string, Pendiente>();

  async guardarLectura(clave: string, valor: unknown): Promise<void> {
    this.lecturas.set(clave, { valor, guardadoEn: new Date().toISOString() });
  }
  async leerLectura(clave: string): Promise<Lectura | null> {
    return this.lecturas.get(clave) ?? null;
  }
  async borrarLecturas(): Promise<void> {
    this.lecturas.clear();
  }
  async guardarPendiente(p: Pendiente): Promise<void> {
    this.cola.set(p.id, { ...p });
  }
  async pendientes(usuarioId: number): Promise<Pendiente[]> {
    return [...this.cola.values()].filter((p) => p.usuarioId === usuarioId).sort(porFecha).map((p) => ({ ...p }));
  }
  async quitarPendiente(id: string): Promise<void> {
    this.cola.delete(id);
  }
}

const BD = 'agroruta-sin-conexion';
const LECTURAS = 'lecturas';
const PENDIENTES = 'pendientes';
/** Las consultas guardadas no crecen sin fin: al pasar de este número se sueltan las más viejas */
const MAX_LECTURAS = 400;

export class AlmacenIndexedDb extends AlmacenSinConexion {
  private bd: Promise<IDBDatabase> | null = null;

  private abrir(): Promise<IDBDatabase> {
    if (!this.bd) {
      this.bd = new Promise<IDBDatabase>((resolve, reject) => {
        const peticion = indexedDB.open(BD, 1);
        peticion.onupgradeneeded = () => {
          const bd = peticion.result;
          if (!bd.objectStoreNames.contains(LECTURAS)) {
            bd.createObjectStore(LECTURAS, { keyPath: 'clave' }).createIndex('guardadoEn', 'guardadoEn');
          }
          if (!bd.objectStoreNames.contains(PENDIENTES)) bd.createObjectStore(PENDIENTES, { keyPath: 'id' });
        };
        peticion.onsuccess = () => resolve(peticion.result);
        peticion.onerror = () => reject(peticion.error);
      });
      // Si no abrió (modo privado, disco lleno) se vuelve a intentar la próxima vez
      this.bd.catch(() => (this.bd = null));
    }
    return this.bd;
  }

  private async en<T>(almacen: string, modo: IDBTransactionMode, accion: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    const bd = await this.abrir();
    return new Promise<T>((resolve, reject) => {
      const tx = bd.transaction(almacen, modo);
      const peticion = accion(tx.objectStore(almacen));
      tx.oncomplete = () => resolve(peticion.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }

  async guardarLectura(clave: string, valor: unknown): Promise<void> {
    await this.en(LECTURAS, 'readwrite', (s) => s.put({ clave, valor, guardadoEn: new Date().toISOString() }));
    if (Math.random() < 0.03) void this.soltarLecturasViejas().catch(() => undefined);
  }

  async leerLectura(clave: string): Promise<Lectura | null> {
    const fila = await this.en<{ valor: unknown; guardadoEn: string } | undefined>(LECTURAS, 'readonly', (s) => s.get(clave));
    return fila ? { valor: fila.valor, guardadoEn: fila.guardadoEn } : null;
  }

  async borrarLecturas(): Promise<void> {
    await this.en(LECTURAS, 'readwrite', (s) => s.clear());
  }

  async guardarPendiente(p: Pendiente): Promise<void> {
    await this.en(PENDIENTES, 'readwrite', (s) => s.put(p));
  }

  async pendientes(usuarioId: number): Promise<Pendiente[]> {
    const todos = await this.en<Pendiente[]>(PENDIENTES, 'readonly', (s) => s.getAll());
    return todos.filter((p) => p.usuarioId === usuarioId).sort(porFecha);
  }

  async quitarPendiente(id: string): Promise<void> {
    await this.en(PENDIENTES, 'readwrite', (s) => s.delete(id));
  }

  private async soltarLecturasViejas(): Promise<void> {
    const total = await this.en<number>(LECTURAS, 'readonly', (s) => s.count());
    if (total <= MAX_LECTURAS) return;
    const claves = await this.en<IDBValidKey[]>(LECTURAS, 'readonly', (s) => s.index('guardadoEn').getAllKeys(null, total - MAX_LECTURAS + 50));
    const bd = await this.abrir();
    const tx = bd.transaction(LECTURAS, 'readwrite');
    claves.forEach((c) => tx.objectStore(LECTURAS).delete(c));
  }
}
