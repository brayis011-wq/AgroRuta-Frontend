import { ChangeDetectionStrategy, Component, Injector, computed, effect, inject, input, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Observable, catchError, defer, map, of, startWith, switchMap } from 'rxjs';
import { CultivoService } from '../../core/services/crop.service';
import { FincaActivaService } from '../../core/services/active-farm.service';
import { Finca, Lote } from '../../core/models/crop.model';
import { nombreCultivo } from '../../core/models/crop.model';
import { Miga, MigasComponent } from './breadcrumbs';
import { Reciente, RecientesService } from '../../core/services/recent.service';

/** Lo que se sabe del camino Finca › Lote › Siembra (los nombres llegan del servidor) */
export interface CadenaCultivo {
  fincaId?: number | null;
  finca?: string | null;
  loteId?: number | null;
  lote?: string | null;
  siembraId?: number | null;
  siembra?: string | null;
  /** No se pudo cargar: se muestran nombres genéricos */
  fallo?: boolean;
}

/**
 * Migas de pan de Cultivos. Basta con dar el nivel más profundo que se conoce
 * (la siembra, el lote o la finca): el resto del camino se busca solo.
 * Las consultas son las mismas que hace la pantalla y el interceptor de copia breve las comparte.
 *
 *   <app-migas-cultivo [siembra]="id" actual="siembra.harvest.title" />
 */
@Component({
  selector: 'app-migas-cultivo',
  standalone: true,
  imports: [MigasComponent],
  template: `<app-migas [items]="items()" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MigasCultivoComponent {
  private cultivo = inject(CultivoService);

  readonly finca = input<number | null | undefined>(null);
  readonly lote = input<number | null | undefined>(null);
  readonly siembra = input<number | null | undefined>(null);
  /** Clave de traducción de la pantalla actual cuando es una acción ("Nuevo lote", "Registrar cosecha") */
  readonly actual = input<string | null>(null);

  private readonly ids = computed(() => ({
    finca: this.finca() || null,
    lote: this.lote() || null,
    siembra: this.siembra() || null,
  }));

  private readonly cadena = toSignal(
    // startWith: al pasar de una siembra a otra no se queda mostrando los nombres de la anterior
    toObservable(this.ids).pipe(
      switchMap(({ finca, lote, siembra }) => this.resolverSeguro(finca, lote, siembra).pipe(startWith({} as CadenaCultivo))),
    ),
    { initialValue: {} as CadenaCultivo },
  );

  /** Los otros lotes de la finca de la miga (para saltar de lote sin volver) */
  private readonly lotesDeFinca = toSignal(
    toObservable(computed(() => this.cadena().fincaId ?? null)).pipe(
      switchMap((id) => (id ? defer(() => this.cultivo.listarLotesPorFinca(id)).pipe(catchError(() => of([] as Lote[]))) : of([] as Lote[]))),
    ),
    { initialValue: [] as Lote[] },
  );
  /** Las fincas del agricultor (las carga el menú lateral); vacío si no hay sesión, como en algunas pruebas */
  private readonly fincas = (() => {
    try { return inject(Injector).get(FincaActivaService).fincas ?? signal<Finca[]>([]); } catch { return signal<Finca[]>([]); }
  })();

  readonly items = computed<Miga[]>(() =>
    conHermanos(armarMigas(this.ids(), this.cadena(), this.actual()), this.ids(), this.cadena(), this.actual(), this.fincas(), this.lotesDeFinca()));

  private readonly recientes = inject(RecientesService);

  constructor() {
    // "Seguir donde iba": la finca, el lote o la siembra que se está viendo (no los formularios)
    effect(() => {
      const r = recienteDe(this.ids(), this.cadena(), this.actual());
      if (r) this.recientes.anotar(r);
    });
  }

  private resolver(fincaId: number | null, loteId: number | null, siembraId: number | null): Observable<CadenaCultivo> {
    const deFinca = (id: number) => this.cultivo.buscarFinca(id).pipe(map((f) => f.nombre));
    const deLote = (id: number): Observable<CadenaCultivo> =>
      this.cultivo.buscarLote(id).pipe(
        switchMap((l) => deFinca(l.fincaId).pipe(
          map((finca) => ({ loteId: id, lote: l.nombre, fincaId: l.fincaId, finca })),
        )),
      );

    let cadena$: Observable<CadenaCultivo>;
    if (siembraId) {
      cadena$ = this.cultivo.buscarSiembra(siembraId).pipe(
        // '' = llegó pero no tiene nombre de cultivo: se muestra "Siembra"
        switchMap((s) => deLote(s.loteId).pipe(map((c) => ({ ...c, siembraId, siembra: nombreCultivo(s) })))),
      );
    } else if (loteId) {
      cadena$ = deLote(loteId);
    } else if (fincaId) {
      cadena$ = deFinca(fincaId).pipe(map((finca) => ({ fincaId, finca })));
    } else {
      return of({});
    }
    return cadena$.pipe(catchError(() => of({ fallo: true })));
  }

  /** Cualquier error (también uno que salte al armar la consulta) deja nombres genéricos, nunca rompe la pantalla */
  private resolverSeguro(fincaId: number | null, loteId: number | null, siembraId: number | null): Observable<CadenaCultivo> {
    return defer(() => this.resolver(fincaId, loteId, siembraId)).pipe(catchError(() => of({ fallo: true })));
  }
}

/** Pone en las migas de finca y lote la lista de sus hermanos (solo en las pantallas de detalle, no en formularios) */
export function conHermanos(items: Miga[], ids: { finca: number | null; lote: number | null; siembra: number | null },
                            c: CadenaCultivo, actual: string | null, fincas: Finca[], lotes: Lote[]): Miga[] {
  if (actual || c.fallo) return items;
  const fincaId = c.fincaId ?? ids.finca;
  const loteId = c.loteId ?? ids.lote;
  return items.map((m, i) => {
    if (i === 1 && fincas.length > 1) {
      return { ...m, hermanos: fincas.filter((f) => f.id != null).map((f) => ({ texto: f.nombre, ruta: ['/crops/farm', f.id!], actual: f.id === fincaId })) };
    }
    if (i === 2 && lotes.length > 1) {
      return { ...m, hermanos: lotes.filter((l) => l.id != null).map((l) => ({ texto: l.nombre, ruta: ['/crops/plot', l.id!], actual: l.id === loteId })) };
    }
    return m;
  });
}

/** Lo que se anota en Recientes cuando ya llegaron los nombres; null en los formularios o si falló */
export function recienteDe(
  ids: { finca: number | null; lote: number | null; siembra: number | null },
  c: CadenaCultivo,
  actual: string | null,
): Reciente | null {
  if (actual || c.fallo) return null;
  if (ids.siembra && c.siembraId === ids.siembra && c.siembra) {
    return { tipo: 'planting', titulo: c.siembra, detalle: [c.lote, c.finca].filter(Boolean).join(' · '), ruta: `/crops/planting/${ids.siembra}` };
  }
  if (!ids.siembra && ids.lote && c.loteId === ids.lote && c.lote) {
    return { tipo: 'plot', titulo: c.lote, detalle: c.finca ?? undefined, ruta: `/crops/plot/${ids.lote}` };
  }
  if (!ids.siembra && !ids.lote && ids.finca && c.fincaId === ids.finca && c.finca) {
    return { tipo: 'farm', titulo: c.finca, ruta: `/crops/farm/${ids.finca}` };
  }
  return null;
}

/** Arma los pasos a partir de los ids pedidos y de lo que ya llegó (separado para probarlo sin servidor) */
export function armarMigas(
  ids: { finca: number | null; lote: number | null; siembra: number | null },
  c: CadenaCultivo,
  actual: string | null,
): Miga[] {
  const nivel = ids.siembra ? 3 : ids.lote ? 2 : ids.finca ? 1 : 0;
  const items: Miga[] = [{ clave: 'cultivo.fincas.list.title', ruta: ['/crops'] }];

  // Mientras carga, el texto es null (hueco); si falló o llegó vacío, un nombre genérico ("Lote")
  const paso = (texto: string | null | undefined, generico: string, ruta: (string | number)[] | null): Miga =>
    texto ? { texto, ruta } : c.fallo || texto === '' ? { clave: generico, ruta } : { texto: null, ruta };

  if (nivel >= 1) {
    const id = c.fincaId ?? ids.finca;
    items.push(paso(c.finca, 'titles.farm', id ? ['/crops/farm', id] : null));
  }
  if (nivel >= 2) {
    const id = c.loteId ?? ids.lote;
    items.push(paso(c.lote, 'temporadas.lote.eyebrow', id ? ['/crops/plot', id] : null));
  }
  if (nivel >= 3) {
    items.push(paso(c.siembra, 'temporadas.ui.planting', ['/crops/planting', ids.siembra!]));
  }
  if (actual) items.push({ clave: actual });
  return items;
}
