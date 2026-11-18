import {
  ChangeDetectionStrategy, Component, ElementRef, HostListener, computed, effect, inject, signal, viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { FincaActivaService } from '../../core/services/active-farm.service';
import { TrabajadorService } from '../../core/services/worker.service';
import { CultivoService } from '../../core/services/crop.service';
import { Trabajador } from '../../core/models/worker.model';
import { Lote, Siembra, nombreCultivo } from '../../core/models/crop.model';

export interface ResultadoBusqueda {
  tipo: 'page' | 'farm' | 'plot' | 'planting' | 'worker';
  titulo: string;
  detalle?: string;
  icono: string;
  ruta: string;
  query?: Record<string, string | number>;
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
  { id: 'calendar', clave: 'temporadas.cal.menu', icono: 'ti-calendar-month', ruta: '/crops/calendar' },
  { id: 'inventory', clave: 'inventario.nav', icono: 'ti-building-warehouse', ruta: '/crops/inventory' },
  { id: 'team', clave: 'layout.nav.team', icono: 'ti-users-group', ruta: '/worker' },
  { id: 'wages', clave: 'layout.nav.wages', icono: 'ti-calendar-event', ruta: '/worker/workdays' },
  { id: 'newWage', clave: 'workers.wages.list.register', icono: 'ti-calendar-plus', ruta: '/worker/workdays/new' },
  { id: 'payrolls', clave: 'layout.nav.payrolls', icono: 'ti-file-invoice', ruta: '/worker/payrolls' },
  { id: 'payments', clave: 'layout.nav.payments', icono: 'ti-cash', ruta: '/worker/payments' },
  { id: 'positions', clave: 'layout.nav.positions', icono: 'ti-id-badge-2', ruta: '/worker/positions' },
  { id: 'labors', clave: 'layout.nav.activities', icono: 'ti-checklist', ruta: '/worker/labors' },
  { id: 'reportPayroll', clave: 'layout.nav.reportPayroll', icono: 'ti-report-money', ruta: '/reports', query: { tab: 'payroll' }, seccion: 'layout.nav.reports' },
  { id: 'reportCrops', clave: 'layout.nav.reportCrops', icono: 'ti-chart-bar', ruta: '/reports', query: { tab: 'crops' }, seccion: 'layout.nav.reports' },
  { id: 'reportCosts', clave: 'reports.tabs.costs.name', icono: 'ti-coins', ruta: '/reports', query: { tab: 'costs' }, seccion: 'layout.nav.reports' },
  { id: 'reportProfit', clave: 'reports.tabs.profitability.name', icono: 'ti-trending-up', ruta: '/reports', query: { tab: 'profitability' }, seccion: 'layout.nav.reports' },
  { id: 'settings', clave: 'layout.nav.settings', icono: 'ti-settings', ruta: '/settings' },
];

/** Un lote con el nombre de su finca */
interface LoteBuscable { lote: Lote; finca: string }
/** Una siembra en curso con su lote y su finca */
interface SiembraBuscable { siembra: Siembra; lote: string; finca: string }

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
    const coincide = (...t: (string | undefined)[]) => !q || t.some((x) => normalizar(x ?? '').includes(q));

    const paginas = PAGINAS
      .map((p) => ({ ...p, titulo: this.translate.instant(p.clave) as string, palabras: this.palabras(p.id) }))
      .filter((p) => coincide(p.titulo, p.palabras))
      .map<ResultadoBusqueda>((p) => ({
        tipo: 'page', titulo: p.titulo, icono: p.icono, ruta: p.ruta, query: p.query,
        detalle: p.seccion ? this.translate.instant(p.seccion) : undefined,
      }));

    const fincas = this.fincas.fincas()
      .filter((f) => coincide(f.nombre, f.ubicacion))
      .map<ResultadoBusqueda>((f) => ({
        tipo: 'farm', titulo: f.nombre, detalle: f.ubicacion, icono: 'ti-map-pin', ruta: `/crops/farm/${f.id}`,
      }));

    const lotes = this.lotes()
      .filter(({ lote, finca }) => coincide(lote.nombre, finca))
      .map<ResultadoBusqueda>(({ lote, finca }) => ({
        tipo: 'plot', titulo: lote.nombre, detalle: finca, icono: 'ti-layout-grid', ruta: `/crops/plot/${lote.id}`,
      }));

    // "café" encuentra la siembra de café; también por variedad, lote o finca
    const siembras = this.siembras()
      .filter(({ siembra, lote, finca }) => coincide(siembra.tipoCultivo ?? '', siembra.variedad ?? '', lote, finca))
      .map<ResultadoBusqueda>(({ siembra, lote, finca }) => ({
        tipo: 'planting', titulo: nombreCultivo(siembra) || this.translate.instant('temporadas.ui.planting'),
        detalle: `${lote} · ${finca}`, icono: 'ti-seedling', ruta: `/crops/planting/${siembra.id}`,
      }));

    const trabajadores = this.trabajadores()
      .filter((t) => coincide(t.nombreCompleto, t.cedula, t.cargo?.nombre))
      .map<ResultadoBusqueda>((t) => ({
        tipo: 'worker', titulo: t.nombreCompleto ?? '', detalle: t.cargo?.nombre ?? t.cedula,
        icono: 'ti-user', ruta: '/worker/workdays', query: { trabajadorId: t.id! },
      }));

    // Sin texto se muestran solo las páginas, para no llenar la lista
    return q ? [...fincas, ...siembras, ...lotes, ...trabajadores, ...paginas].slice(0, 12) : paginas;
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
      this.abierto() ? this.cerrar() : this.abrir();
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
    forkJoin(fincas.map((f) => this.cultivo.listarLotesPorFinca(f.id!).pipe(
      map((ls) => ls.map((lote): LoteBuscable => ({ lote, finca: f.nombre }))),
      catchError(() => of([] as LoteBuscable[])),
    ))).pipe(
      map((l) => l.flat()),
      switchMap((lotes) => {
        this.lotes.set(lotes);
        const sembrados = lotes.filter(({ lote }) => lote.estado === 'EN_CULTIVO' && lote.id != null);
        return sembrados.length
          ? forkJoin(sembrados.map(({ lote, finca }) => this.cultivo.buscarSiembraPorLote(lote.id!).pipe(
              map((s): SiembraBuscable | null => (s?.id ? { siembra: s, lote: lote.nombre, finca } : null)),
              catchError(() => of(null)),
            )))
          : of([] as (SiembraBuscable | null)[]);
      }),
      catchError(() => { this.cultivosCargadosEn = 0; return of([] as (SiembraBuscable | null)[]); }),
    ).subscribe((s) => this.siembras.set(s.filter((x): x is SiembraBuscable => x !== null)));
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
    if (e.key === 'ArrowDown') { e.preventDefault(); this.indice.set(n ? (this.indice() + 1) % n : 0); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); this.indice.set(n ? (this.indice() - 1 + n) % n : 0); }
    else if (e.key === 'Enter') { e.preventDefault(); const r = this.resultados()[this.indice()]; if (r) this.ir(r); }
    else if (e.key === 'Escape') { e.preventDefault(); this.cerrar(); }
  }

  ir(r: ResultadoBusqueda): void {
    this.cerrar();
    this.router.navigate([r.ruta], { queryParams: r.query });
  }
}
