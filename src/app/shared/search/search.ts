import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { FincaActivaService } from '../../core/services/active-farm.service';
import { RecientesService } from '../../core/services/recent.service';
import { TrabajadorService } from '../../core/services/worker.service';
import { CultivoService } from '../../core/services/crop.service';
import { Trabajador } from '../../core/models/worker.model';
import { Lote, Siembra, nombreCultivo } from '../../core/models/crop.model';

export interface ResultadoBusqueda {
  tipo: 'action' | 'page' | 'farm' | 'plot' | 'planting' | 'worker';
  titulo: string;
  detalle?: string;
  icono: string;
  ruta: string;
  query?: Record<string, string | number>;
  /** Visitado hace poco (sale arriba cuando el buscador abre vacío) */
  reciente?: boolean;
}

interface Pagina {
  /** Para las palabras parecidas: search.keywords.<id> ("abono" encuentra la bodega) */
  id: string;
  clave: string;
  icono: string;
  ruta: string;
  query?: Record<string, string>;
  /** Clave de la sección, si el título solo no basta ("Nómina" del reporte frente a "Nóminas") */
  seccion?: string;
}

const PAGINAS: Pagina[] = [
  { id: 'home', clave: 'layout.nav.home', icono: 'ti-layout-dashboard', ruta: '/dashboard' },
  { id: 'farms', clave: 'layout.nav.myFarms', icono: 'ti-plant', ruta: '/crops' },
  { id: 'newFarm', clave: 'layout.nav.newFarm', icono: 'ti-plus', ruta: '/crops/new-farm' },
  {
    id: 'calendar',
    clave: 'temporadas.cal.menu',
    icono: 'ti-calendar-month',
    ruta: '/crops/calendar',
  },
  {
    id: 'inventory',
    clave: 'inventario.nav',
    icono: 'ti-building-warehouse',
    ruta: '/crops/inventory',
  },
  { id: 'team', clave: 'layout.nav.team', icono: 'ti-users-group', ruta: '/worker' },
  { id: 'sheet', clave: 'layout.nav.sheet', icono: 'ti-table', ruta: '/worker/sheet' },
  { id: 'wages', clave: 'layout.nav.wages', icono: 'ti-calendar-event', ruta: '/worker/workdays' },
  {
    id: 'newWage',
    clave: 'workers.wages.list.register',
    icono: 'ti-calendar-plus',
    ruta: '/worker/workdays/new',
  },
  {
    id: 'payrolls',
    clave: 'layout.nav.payrolls',
    icono: 'ti-file-invoice',
    ruta: '/worker/payrolls',
  },
  { id: 'payments', clave: 'layout.nav.payments', icono: 'ti-cash', ruta: '/worker/payments' },
  { id: 'yield', clave: 'layout.nav.yield', icono: 'ti-chart-bar', ruta: '/worker/yield' },
  { id: 'sales', clave: 'layout.nav.sales', icono: 'ti-receipt-2', ruta: '/finance/sales' },
  {
    id: 'toSell',
    clave: 'ventas.stock.title',
    icono: 'ti-building-warehouse',
    ruta: '/finance/sales',
    seccion: 'layout.nav.sales',
  },
  { id: 'expenses', clave: 'layout.nav.expenses', icono: 'ti-receipt', ruta: '/finance/expenses' },
  { id: 'prices', clave: 'layout.nav.prices', icono: 'ti-chart-line', ruta: '/finance/prices' },
  {
    id: 'positions',
    clave: 'layout.nav.positions',
    icono: 'ti-id-badge-2',
    ruta: '/worker/positions',
  },
  { id: 'labors', clave: 'layout.nav.activities', icono: 'ti-checklist', ruta: '/worker/labors' },
  {
    id: 'reportPayroll',
    clave: 'layout.nav.reportPayroll',
    icono: 'ti-report-money',
    ruta: '/reports',
    query: { tab: 'payroll' },
    seccion: 'layout.nav.reports',
  },
  {
    id: 'reportCrops',
    clave: 'layout.nav.reportCrops',
    icono: 'ti-chart-bar',
    ruta: '/reports',
    query: { tab: 'crops' },
    seccion: 'layout.nav.reports',
  },
  {
    id: 'reportCosts',
    clave: 'reports.tabs.costs.name',
    icono: 'ti-coins',
    ruta: '/reports',
    query: { tab: 'costs' },
    seccion: 'layout.nav.reports',
  },
  {
    id: 'reportProfit',
    clave: 'reports.tabs.profitability.name',
    icono: 'ti-trending-up',
    ruta: '/reports',
    query: { tab: 'profitability' },
    seccion: 'layout.nav.reports',
  },
  {
    id: 'reportFieldbook',
    clave: 'reports.tabs.fieldbook.name',
    icono: 'ti-notebook',
    ruta: '/reports',
    query: { tab: 'fieldbook' },
    seccion: 'layout.nav.reports',
  },
  { id: 'settings', clave: 'layout.nav.settings', icono: 'ti-settings', ruta: '/settings' },
];

/** Lo que se puede registrar en una siembra en curso desde el buscador ("cosecha café") */
const ACCIONES_SIEMBRA = [
  { id: 'harvest', icono: 'ti-basket', ruta: 'harvest' },
  { id: 'spray', icono: 'ti-spray', ruta: 'spraying' },
  { id: 'activity', icono: 'ti-clipboard-list', ruta: 'activity' },
] as const;

/** Acciones que no dependen de una siembra: abren el formulario directamente */
const ACCIONES_GENERALES: {
  id: string;
  icono: string;
  ruta: string;
  query?: Record<string, string>;
}[] = [
  { id: 'wage', icono: 'ti-calendar-plus', ruta: '/worker/workdays/new' },
  { id: 'worker', icono: 'ti-user-plus', ruta: '/worker', query: { nuevo: '1' } },
  {
    id: 'purchase',
    icono: 'ti-shopping-cart-plus',
    ruta: '/crops/inventory',
    query: { compra: '1' },
  },
  { id: 'farm', icono: 'ti-map-pin-plus', ruta: '/crops/new-farm' },
  { id: 'sale', icono: 'ti-shopping-cart', ruta: '/finance/sales', query: { nueva: '1' } },
  { id: 'expense', icono: 'ti-receipt', ruta: '/finance/expenses', query: { nuevo: '1' } },
  { id: 'sheet', icono: 'ti-table', ruta: '/worker/sheet' },
];

/** Cada palabra de la búsqueda debe aparecer en alguno de los textos */
export function todasLasPalabras(q: string, ...textos: string[]): boolean {
  const palabras = q.split(/\s+/).filter(Boolean);
  const todo = textos.map(normalizar).join(' ');
  return palabras.length > 0 && palabras.every((p) => todo.includes(p));
}

/** Un lote con el nombre de su finca */
interface LoteBuscable {
  lote: Lote;
  finca: string;
}
/** Una siembra en curso con su lote y su finca */
interface SiembraBuscable {
  siembra: Siembra;
  lote: string;
  finca: string;
}

/** Quita tildes y mayúsculas para comparar: "Nómina" ≈ "nomina" */
export function normalizar(t: string): string {
  return (t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/** Buscador rápido (Ctrl K): páginas, fincas, lotes, siembras en curso y trabajadores */
@Component({
  selector: 'app-buscador',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './search.html',
  styleUrl: './search.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BuscadorComponent {
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);
  private readonly fincas = inject(FincaActivaService);
  private readonly trabajadorService = inject(TrabajadorService);
  private readonly cultivo = inject(CultivoService);
  private readonly recientes = inject(RecientesService);

  readonly abierto = signal(false);
  readonly texto = signal('');
  readonly indice = signal(0);
  private readonly trabajadores = signal<Trabajador[]>([]);
  private trabajadoresCargados = false;
  private readonly lotes = signal<LoteBuscable[]>([]);
  private readonly siembras = signal<SiembraBuscable[]>([]);
  /** Cuándo se cargaron los lotes y siembras (se refrescan si pasó más de un minuto: pudo crearse uno) */
  private cultivosCargadosEn = 0;
  private readonly campo = viewChild<ElementRef<HTMLInputElement>>('campo');

  readonly resultados = computed<ResultadoBusqueda[]>(() => {
    const q = normalizar(this.texto());
    const coincide = (...t: (string | undefined)[]) =>
      !q || t.some((x) => normalizar(x ?? '').includes(q));

    const paginas = PAGINAS.map((p) => ({
      ...p,
      titulo: this.translate.instant(p.clave) as string,
      palabras: this.palabras(p.id),
    }))
      .filter((p) => coincide(p.titulo, p.palabras))
      .map<ResultadoBusqueda>((p) => ({
        tipo: 'page',
        titulo: p.titulo,
        icono: p.icono,
        ruta: p.ruta,
        query: p.query,
        detalle: p.seccion ? this.translate.instant(p.seccion) : undefined,
      }));

    const fincas = this.fincas
      .fincas()
      .filter((f) => coincide(f.nombre, f.ubicacion))
      .map<ResultadoBusqueda>((f) => ({
        tipo: 'farm',
        titulo: f.nombre,
        detalle: f.ubicacion,
        icono: 'ti-map-pin',
        ruta: `/crops/farm/${f.id}`,
      }));

    const lotes = this.lotes()
      .filter(({ lote, finca }) => coincide(lote.nombre, finca))
      .map<ResultadoBusqueda>(({ lote, finca }) => ({
        tipo: 'plot',
        titulo: lote.nombre,
        detalle: finca,
        icono: 'ti-layout-grid',
        ruta: `/crops/plot/${lote.id}`,
      }));

    // "café" encuentra la siembra de café; también por variedad, lote o finca
    const siembras = this.siembras()
      .filter(({ siembra, lote, finca }) =>
        coincide(siembra.tipoCultivo ?? '', siembra.variedad ?? '', lote, finca),
      )
      .map<ResultadoBusqueda>(({ siembra, lote, finca }) => ({
        tipo: 'planting',
        titulo: nombreCultivo(siembra) || this.translate.instant('temporadas.ui.planting'),
        detalle: `${lote} · ${finca}`,
        icono: 'ti-seedling',
        ruta: `/crops/planting/${siembra.id}`,
      }));

    const trabajadores = this.trabajadores()
      .filter((t) => coincide(t.nombreCompleto, t.cedula, t.cargo?.nombre))
      .map<ResultadoBusqueda>((t) => ({
        tipo: 'worker',
        titulo: t.nombreCompleto ?? '',
        detalle: t.cargo?.nombre ?? t.cedula,
        icono: 'ti-user',
        ruta: '/worker/workdays',
        query: { trabajadorId: t.id! },
      }));

    // Acciones: "cosecha" ofrece registrar una cosecha en cada siembra; "cosecha café", solo en las de café
    const acciones: ResultadoBusqueda[] = [];
    if (q) {
      for (const a of ACCIONES_GENERALES) {
        const titulo = this.translate.instant(`search.actions.${a.id}`) as string;
        if (todasLasPalabras(q, titulo, this.palabras(`action.${a.id}`))) {
          acciones.push({ tipo: 'action', titulo, icono: a.icono, ruta: a.ruta, query: a.query });
        }
      }
      for (const a of ACCIONES_SIEMBRA) {
        const verbo = this.translate.instant(`search.actions.${a.id}`) as string;
        const palabrasAccion = `${verbo} ${this.palabras(`action.${a.id}`)}`;
        for (const { siembra, lote, finca } of this.siembras()) {
          const nombre = nombreCultivo(siembra) || this.translate.instant('temporadas.ui.planting');
          const deLaSiembra = `${siembra.tipoCultivo ?? ''} ${siembra.variedad ?? ''} ${lote} ${finca}`;
          const palabras = q.split(/\s+/).filter(Boolean);
          // Al menos una palabra tiene que ser de la acción ("café" solo no ofrece registrar nada)
          if (
            todasLasPalabras(q, palabrasAccion, deLaSiembra) &&
            palabras.some((p) => normalizar(palabrasAccion).includes(p))
          ) {
            acciones.push({
              tipo: 'action',
              titulo: `${verbo} · ${nombre}`,
              detalle: `${lote} · ${finca}`,
              icono: a.icono,
              ruta: `/crops/planting/${siembra.id}/${a.ruta}`,
            });
          }
        }
      }
    }

    // Sin texto se muestran solo las páginas, para no llenar la lista
    if (q)
      return [...acciones, ...fincas, ...siembras, ...lotes, ...trabajadores, ...paginas].slice(
        0,
        12,
      );
    // Sin texto: primero lo último que se abrió ("seguir donde iba") y después las páginas
    const recientes = this.recientes.lista().map<ResultadoBusqueda>((r) => ({
      tipo: r.tipo,
      titulo: r.titulo,
      detalle: r.detalle,
      ruta: r.ruta,
      query: r.query,
      reciente: true,
      icono:
        r.tipo === 'planting'
          ? 'ti-seedling'
          : r.tipo === 'plot'
            ? 'ti-layout-grid'
            : r.tipo === 'farm'
              ? 'ti-map-pin'
              : 'ti-user',
    }));
    return [...recientes, ...paginas];
  });

  /** Palabras parecidas de una página ('' si no tiene) */
  private palabras(id: string): string {
    const clave = `search.keywords.${id}`;
    const t = this.translate.instant(clave) as string;
    return t === clave ? '' : t;
  }

  constructor() {
    // Al abrir: foco en el campo
    effect(() => {
      if (this.abierto()) queueMicrotask(() => this.campo()?.nativeElement.focus());
    });
  }

  @HostListener('document:keydown', ['$event'])
  atajo(e: KeyboardEvent): void {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (this.abierto()) this.cerrar();
      else this.abrir();
    }
  }

  abrir(): void {
    this.texto.set('');
    this.indice.set(0);
    this.abierto.set(true);
    if (!this.trabajadoresCargados) {
      this.trabajadoresCargados = true;
      this.trabajadorService.listarTodos().subscribe({
        next: (t) => this.trabajadores.set(t),
        error: () => (this.trabajadoresCargados = false),
      });
    }
    this.cargarCultivos();
  }

  /**
   * Lotes de todas las fincas y las siembras en curso. Se piden al abrir, como mucho una vez por minuto.
   * Son las mismas consultas que hace el Inicio: el interceptor de copia breve las comparte.
   */
  private cargarCultivos(): void {
    const fincas = this.fincas.fincas().filter((f) => f.id != null);
    // Sin fincas aún (el menú no las ha cargado): se intenta en la próxima apertura
    if (!fincas.length || Date.now() - this.cultivosCargadosEn < 60_000) return;
    this.cultivosCargadosEn = Date.now();
    forkJoin(
      fincas.map((f) =>
        this.cultivo.listarLotesPorFinca(f.id!).pipe(
          map((ls) => ls.map((lote): LoteBuscable => ({ lote, finca: f.nombre }))),
          catchError(() => of([] as LoteBuscable[])),
        ),
      ),
    )
      .pipe(
        map((l) => l.flat()),
        switchMap((lotes) => {
          this.lotes.set(lotes);
          const sembrados = lotes.filter(
            ({ lote }) => lote.estado === 'EN_CULTIVO' && lote.id != null,
          );
          return sembrados.length
            ? forkJoin(
                sembrados.map(({ lote, finca }) =>
                  this.cultivo.buscarSiembraPorLote(lote.id!).pipe(
                    map((s): SiembraBuscable | null =>
                      s?.id ? { siembra: s, lote: lote.nombre, finca } : null,
                    ),
                    catchError(() => of(null)),
                  ),
                ),
              )
            : of([] as (SiembraBuscable | null)[]);
        }),
        catchError(() => {
          this.cultivosCargadosEn = 0;
          return of([] as (SiembraBuscable | null)[]);
        }),
      )
      .subscribe((s) => this.siembras.set(s.filter((x): x is SiembraBuscable => x !== null)));
  }

  cerrar(): void {
    this.abierto.set(false);
  }

  escribir(v: string): void {
    this.texto.set(v);
    this.indice.set(0);
  }

  teclas(e: KeyboardEvent): void {
    const n = this.resultados().length;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.indice.set(n ? (this.indice() + 1) % n : 0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.indice.set(n ? (this.indice() - 1 + n) % n : 0);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const r = this.resultados()[this.indice()];
      if (r) this.ir(r);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      this.cerrar();
    }
  }

  ir(r: ResultadoBusqueda): void {
    this.cerrar();
    this.router.navigate([r.ruta], { queryParams: r.query });
  }
}
