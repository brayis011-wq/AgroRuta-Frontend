import { Injectable, inject } from '@angular/core';
import { Observable, catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { CultivoService } from './crop.service';
import { Finca, Lote, Siembra } from '../models/crop.model';

/** Una siembra en curso con su lote y su finca */
export interface SiembraActiva {
  siembra: Siembra;
  lote: Lote;
  finca: Finca;
}

/**
 * Las siembras en curso de todas las fincas, en el orden de las fincas y de los lotes. Son las mismas
 * consultas que hacen el Inicio y el buscador: el interceptor de copia breve las comparte.
 */
@Injectable({ providedIn: 'root' })
export class SiembrasActivasService {
  private readonly cultivo = inject(CultivoService);

  listar(fincas: Finca[]): Observable<SiembraActiva[]> {
    const conId = fincas.filter((f) => f.id != null);
    if (!conId.length) return of([]);
    return forkJoin(conId.map((f) => this.cultivo.listarLotesPorFinca(f.id!).pipe(
      map((lotes) => ordenar(lotes).filter((l) => l.estado === 'EN_CULTIVO' && l.id != null).map((lote) => ({ lote, finca: f }))),
      catchError(() => of([] as { lote: Lote; finca: Finca }[])),
    ))).pipe(
      map((l) => l.flat()),
      switchMap((lotes) => (lotes.length
        ? forkJoin(lotes.map(({ lote, finca }) => this.cultivo.buscarSiembraPorLote(lote.id!).pipe(
            map((siembra): SiembraActiva | null => (siembra?.id ? { siembra, lote, finca } : null)),
            catchError(() => of(null)),
          )))
        : of([] as (SiembraActiva | null)[]))),
      map((s) => s.filter((x): x is SiembraActiva => x !== null)),
    );
  }
}

/** Por nombre, con los números en orden natural (Lote 2 antes que Lote 10) */
export function ordenar<T extends { nombre?: string | null }>(lista: T[]): T[] {
  return [...lista].sort((a, b) => (a.nombre ?? '').localeCompare(b.nombre ?? '', undefined, { numeric: true }));
}

/** La anterior y la siguiente de una lista (null en los extremos) */
export function vecinos<T>(lista: T[], esActual: (x: T) => boolean): { anterior: T | null; siguiente: T | null; posicion: number } {
  const i = lista.findIndex(esActual);
  if (i < 0) return { anterior: null, siguiente: null, posicion: -1 };
  return { anterior: lista[i - 1] ?? null, siguiente: lista[i + 1] ?? null, posicion: i };
}
