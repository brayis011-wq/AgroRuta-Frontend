import {
  ChangeDetectionStrategy, Component, ElementRef, HostListener, computed, effect, inject, signal, viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { FincaActivaService } from '../../core/services/finca-activa.service';
import { TrabajadorService } from '../../core/services/worker.service';
import { Trabajador } from '../../core/models/worker.model';

export interface ResultadoBusqueda {
  tipo: 'page' | 'farm' | 'worker';
  titulo: string;
  detalle?: string;
  icono: string;
  ruta: string;
  query?: Record<string, string | number>;
}

const PAGINAS: { clave: string; icono: string; ruta: string; query?: Record<string, string> }[] = [
  { clave: 'layout.nav.home', icono: 'ti-layout-dashboard', ruta: '/dashboard' },
  { clave: 'layout.nav.myFarms', icono: 'ti-plant', ruta: '/cultivo' },
  { clave: 'layout.nav.newFarm', icono: 'ti-plus', ruta: '/cultivo/nueva-finca' },
  { clave: 'temporadas.cal.menu', icono: 'ti-calendar-month', ruta: '/cultivo/calendario' },
  { clave: 'layout.nav.team', icono: 'ti-users-group', ruta: '/worker' },
  { clave: 'layout.nav.wages', icono: 'ti-calendar-event', ruta: '/worker/jornales' },
  { clave: 'workers.wages.list.register', icono: 'ti-calendar-plus', ruta: '/worker/jornales/nuevo' },
  { clave: 'layout.nav.payrolls', icono: 'ti-file-invoice', ruta: '/worker/nominas' },
  { clave: 'layout.nav.payments', icono: 'ti-cash', ruta: '/worker/pagos' },
  { clave: 'layout.nav.positions', icono: 'ti-id-badge-2', ruta: '/worker/cargos' },
  { clave: 'layout.nav.activities', icono: 'ti-checklist', ruta: '/worker/labores' },
  { clave: 'layout.nav.reportPayroll', icono: 'ti-report-money', ruta: '/reportes', query: { tab: 'payroll' } },
  { clave: 'layout.nav.reportCrops', icono: 'ti-chart-bar', ruta: '/reportes', query: { tab: 'crops' } },
  { clave: 'layout.nav.settings', icono: 'ti-settings', ruta: '/configuracion' },
];

/** Quita tildes y mayúsculas para comparar: "Nómina" ≈ "nomina" */
export function normalizar(t: string): string {
  return (t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/** Buscador rápido (Ctrl K): páginas, fincas y trabajadores */
@Component({
  selector: 'app-buscador',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './buscador.html',
  styleUrl: './buscador.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BuscadorComponent {
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);
  private readonly fincas = inject(FincaActivaService);
  private readonly trabajadorService = inject(TrabajadorService);

  readonly abierto = signal(false);
  readonly texto = signal('');
  readonly indice = signal(0);
  private readonly trabajadores = signal<Trabajador[]>([]);
  private trabajadoresCargados = false;
  private readonly campo = viewChild<ElementRef<HTMLInputElement>>('campo');

  readonly resultados = computed<ResultadoBusqueda[]>(() => {
    const q = normalizar(this.texto());
    const coincide = (...t: (string | undefined)[]) => !q || t.some((x) => normalizar(x ?? '').includes(q));

    const paginas = PAGINAS
      .map((p) => ({ ...p, titulo: this.translate.instant(p.clave) as string }))
      .filter((p) => coincide(p.titulo))
      .map<ResultadoBusqueda>((p) => ({ tipo: 'page', titulo: p.titulo, icono: p.icono, ruta: p.ruta, query: p.query }));

    const fincas = this.fincas.fincas()
      .filter((f) => coincide(f.nombre, f.ubicacion))
      .map<ResultadoBusqueda>((f) => ({
        tipo: 'farm', titulo: f.nombre, detalle: f.ubicacion, icono: 'ti-map-pin', ruta: `/cultivo/finca/${f.id}`,
      }));

    const trabajadores = this.trabajadores()
      .filter((t) => coincide(t.nombreCompleto, t.cedula, t.cargo?.nombre))
      .map<ResultadoBusqueda>((t) => ({
        tipo: 'worker', titulo: t.nombreCompleto ?? '', detalle: t.cargo?.nombre ?? t.cedula,
        icono: 'ti-user', ruta: '/worker/jornales', query: { trabajadorId: t.id! },
      }));

    // Sin texto se muestran solo las páginas, para no llenar la lista
    return q ? [...fincas, ...trabajadores, ...paginas].slice(0, 12) : paginas;
  });

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
