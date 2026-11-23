import { Injectable, inject, signal } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { CultivoService } from '../services/crop.service';
import { JornalService, LaborService, TrabajadorService } from '../services/worker.service';
import { InventarioService } from '../services/inventory.service';
import { AgriculturalInputService } from '../services/agricultural-input.service';
import { VentasService } from '../services/finance.service';
import { ColaSinConexionService } from './offline-queue.service';

/** Cada cuánto se vuelven a descargar los datos para trabajar sin señal */
export const CADA_CUANTO_MS = 6 * 60 * 60 * 1000;
/** Al volver la señal, si la última descarga tiene más de esto */
export const AL_VOLVER_MS = 30 * 60 * 1000;
/** Espera tras abrir la app, para no competir con la pantalla que se está mostrando */
const ESPERA_INICIAL_MS = 8000;
/** Peticiones a la vez */
const A_LA_VEZ = 3;

const clave = (uid: number) => `agroruta.sinConexion.descargado.${uid}`;

/**
 * Deja guardado en el dispositivo lo que piden los formularios del campo (trabajadores, labores, siembras
 * en curso con su lote, finca y registros, la bodega, los kilos por vender...), aunque la persona no haya
 * abierto esas pantallas. Usa los mismos servicios que las pantallas, así la copia queda con la misma
 * dirección exacta que la pantalla pedirá sin señal. La copia la guarda el interceptor sin conexión.
 */
@Injectable({ providedIn: 'root' })
export class PrecargaDatosService {
  private readonly auth = inject(AuthService);
  private readonly cola = inject(ColaSinConexionService);
  private readonly cultivo = inject(CultivoService);
  private readonly trabajadores = inject(TrabajadorService);
  private readonly labores = inject(LaborService);
  private readonly jornales = inject(JornalService);
  private readonly inventario = inject(InventarioService);
  private readonly insumos = inject(AgriculturalInputService);
  private readonly ventas = inject(VentasService);

  /** Cuándo terminó la última descarga (ISO), de la persona con sesión */
  readonly ultima = signal<string | null>(null);
  readonly descargando = signal(false);
  /** Cuántas consultas quedaron guardadas en la última descarga */
  readonly guardadas = signal(0);

  private iniciado = false;

  /** Solo el agricultor registra en el campo desde esta parte de la app */
  private uidAgricultor(): number | null {
    const u = this.auth.getUsuario() as { id?: number; rol?: string } | null;
    return u?.id != null && (u.rol ?? '').toLowerCase() === 'agricultor' ? u.id : null;
  }

  /** Lo llama el indicador del modo sin conexión, una vez */
  iniciar(): void {
    if (this.iniciado || typeof window === 'undefined') return;
    this.iniciado = true;
    this.leerUltima();
    setTimeout(() => this.siHaceFalta(CADA_CUANTO_MS), ESPERA_INICIAL_MS);
    window.addEventListener('online', () => setTimeout(() => this.siHaceFalta(AL_VOLVER_MS), 3000));
    setInterval(() => this.siHaceFalta(CADA_CUANTO_MS), 30 * 60 * 1000);
  }

  private leerUltima(): void {
    const uid = this.uidAgricultor();
    try {
      this.ultima.set(uid == null ? null : localStorage.getItem(clave(uid)));
    } catch {
      this.ultima.set(null);
    }
  }

  /** Descarga si la última descarga tiene más de esa antigüedad (y hay señal y no ahorra datos) */
  siHaceFalta(antiguedadMs: number): void {
    if (!this.cola.enLinea() || this.uidAgricultor() == null) return;
    const ahorro = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    if (ahorro) return;
    this.leerUltima();
    const u = this.ultima();
    if (u && Date.now() - new Date(u).getTime() < antiguedadMs) return;
    void this.descargar();
  }

  /** Descarga todo ahora. Nunca falla: lo que no se pueda traer se intenta en la próxima. */
  async descargar(): Promise<void> {
    const uid = this.uidAgricultor();
    if (uid == null || this.descargando()) return;
    this.descargando.set(true);
    let ok = 0;
    const traer = async <T>(o: Observable<T>): Promise<T | null> => {
      try {
        const r = await firstValueFrom(o);
        ok++;
        return r;
      } catch {
        return null;
      }
    };
    try {
      // Listas generales que piden los formularios
      await enGrupos<unknown>([
        () => traer(this.trabajadores.listar()),
        () => traer(this.trabajadores.listarTodos()),
        () => traer(this.labores.listar()),
        () => traer(this.jornales.cultivosDisponibles()),
        () => traer(this.inventario.stock()),
        () => traer(this.insumos.getAll()),
        () => traer(this.ventas.kilosEnBodega()),
        () => traer(this.ventas.listar()),
        () => traer(this.ventas.resumen()),
      ]);

      // Fincas → lotes en cultivo → su siembra y lo que muestra la ficha y sus formularios
      const fincas = (await traer(this.cultivo.listarFincasPorAgricultor(uid))) ?? [];
      const lotes = (await enGrupos(fincas.filter((f) => f.id != null).map((f) => () => traer(this.cultivo.listarLotesPorFinca(f.id!)))))
        .flatMap((l) => l ?? [])
        .filter((l) => l.estado === 'EN_CULTIVO' && l.id != null);
      const siembras = (await enGrupos(lotes.map((l) => () => traer(this.cultivo.buscarSiembraPorLote(l.id!)))))
        .filter((s): s is NonNullable<typeof s> => !!s?.id);
      await enGrupos(fincas.filter((f) => f.id != null).map((f) => () => traer(this.cultivo.buscarFinca(f.id!))));
      await enGrupos(lotes.map((l) => () => traer(this.cultivo.buscarLote(l.id!))));
      await enGrupos<unknown>(siembras.flatMap((s): (() => Promise<unknown>)[] => [
        () => traer(this.cultivo.buscarSiembra(s.id!)),
        () => traer(this.cultivo.resumenSiembra(s.id!)),
        () => traer(this.cultivo.listarActividades(s.id!)),
        () => traer(this.cultivo.listarFumigaciones(s.id!)),
        () => traer(this.cultivo.listarCosechas(s.id!)),
      ]));

      // Solo cuenta como descarga si llegó algo (sin señal todo falla y no se anota)
      if (ok > 0) {
        const ahora = new Date().toISOString();
        try {
          localStorage.setItem(clave(uid), ahora);
        } catch {
          // sin almacenamiento: se intentará de nuevo en la próxima vuelta
        }
        this.ultima.set(ahora);
        this.guardadas.set(ok);
      }
    } finally {
      this.descargando.set(false);
    }
  }
}

/** Corre las tareas de a A_LA_VEZ y devuelve los resultados en orden */
async function enGrupos<T>(tareas: (() => Promise<T>)[]): Promise<T[]> {
  const resultados: T[] = new Array(tareas.length);
  let siguiente = 0;
  const trabajador = async () => {
    while (siguiente < tareas.length) {
      const i = siguiente++;
      resultados[i] = await tareas[i]();
    }
  };
  await Promise.all(Array.from({ length: Math.min(A_LA_VEZ, tareas.length) }, trabajador));
  return resultados;
}
