import { Injectable, computed, inject, signal } from '@angular/core';
import { CultivoService } from './crop.service';
import { AuthService } from './auth.service';
import { Finca, Lote } from '../models/crop.model';

const CLAVE = 'fincaActiva';

/**
 * Finca elegida en el selector del menú lateral.
 * null = "Todas las fincas". La elección se recuerda en este navegador.
 */
@Injectable({ providedIn: 'root' })
export class FincaActivaService {
  private readonly cultivo = inject(CultivoService);
  private readonly auth = inject(AuthService);

  readonly fincas = signal<Finca[]>([]);
  readonly idActiva = signal<number | null>(leer());
  /** Lotes de la finca activa (vacío con "todas") */
  readonly lotes = signal<Lote[]>([]);
  private readonly lotesCargados = signal(false);
  /** Cantidad de lotes de la finca activa (null mientras carga o con "todas") */
  readonly lotesActiva = computed<number | null>(() =>
    this.idActiva() != null && this.lotesCargados() ? this.lotes().length : null);

  readonly activa = computed<Finca | null>(() => {
    const id = this.idActiva();
    return this.fincas().find((f) => f.id === id) ?? null;
  });

  /** Finca de referencia para el clima: la activa, o la primera con ubicación */
  readonly paraClima = computed<Finca | null>(() =>
    this.activa() ?? this.fincas().find((f) => f.centroideLat != null) ?? this.fincas()[0] ?? null);

  /** Vuelve a leer los lotes (p. ej. después de crear uno) */
  refrescarLotes(): void {
    this.cargarLotes();
  }

  cargar(): void {
    const id = this.auth.getUsuario()?.id;
    if (id == null) return;
    this.cultivo.listarFincasPorAgricultor(id).subscribe({
      next: (f) => {
        const ordenadas = [...f].sort((a, b) => a.nombre.localeCompare(b.nombre));
        this.fincas.set(ordenadas);
        const guardada = this.idActiva();
        // Si la finca guardada ya no existe, se elige la única que haya o "todas"
        if (guardada != null && !ordenadas.some((x) => x.id === guardada)) {
          this.elegir(ordenadas.length === 1 ? ordenadas[0].id! : null);
        } else if (guardada == null && ordenadas.length === 1) {
          this.elegir(ordenadas[0].id!);
        } else {
          this.cargarLotes();
        }
      },
      error: () => this.fincas.set([]),
    });
  }

  elegir(id: number | null): void {
    this.idActiva.set(id);
    try {
      id == null ? localStorage.removeItem(CLAVE) : localStorage.setItem(CLAVE, String(id));
    } catch { /* sin almacenamiento */ }
    this.cargarLotes();
  }

  private cargarLotes(): void {
    const id = this.idActiva();
    this.lotes.set([]);
    this.lotesCargados.set(false);
    if (id == null) return;
    this.cultivo.listarLotesPorFinca(id).subscribe({
      next: (l) => {
        if (this.idActiva() !== id) return;
        this.lotes.set([...l].sort((a, b) => (a.nombre ?? '').localeCompare(b.nombre ?? '', undefined, { numeric: true })));
        this.lotesCargados.set(true);
      },
      error: () => this.lotesCargados.set(false),
    });
  }
}

function leer(): number | null {
  try {
    const v = localStorage.getItem(CLAVE);
    return v ? Number(v) : null;
  } catch {
    return null;
  }
}
