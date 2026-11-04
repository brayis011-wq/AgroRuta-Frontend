import { Component, DestroyRef, HostListener, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { NgTemplateOutlet, UpperCasePipe } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { filter } from 'rxjs';
import { AuthService } from '../../core/services/auth';
import { AuthResponse } from '../../core/models/auth.model';
import { LanguageService, Lang } from '../../core/services/language.service';
import { NominaService } from '../../core/services/worker.service';
import { CultivoService } from '../../core/services/cultivo.service';
import { Finca } from '../../core/models/cultivo.model';

const CLAVE_COLAPSADO = 'sidebarColapsado';
/** Fincas que se muestran como accesos directos en el submenú de Cultivos */
const MAX_FINCAS_MENU = 8;

type IdGrupo = 'cultivos' | 'trabajadores' | 'reportes';

export interface ItemSubmenu {
  ruta: string;
  /** Clave de traducción, o texto ya listo (nombre de una finca) */
  clave?: string;
  texto?: string;
  exacto?: boolean;
  query?: Record<string, string>;
  contador?: boolean;
  icono?: string;
}

/** Panel del agricultor: menú lateral claro, submenú de trabajadores y barra inferior en celular. */
@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterModule, TranslatePipe, UpperCasePipe, NgTemplateOutlet],
  templateUrl: './layout.html',
  styleUrls: ['./layout.css', './layout-movil.css'],
})
export class LayoutComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly nominaService = inject(NominaService);
  private readonly cultivoService = inject(CultivoService);
  readonly lang = inject(LanguageService);

  readonly usuario: AuthResponse | null = this.authService.getUsuario();
  readonly colapsado = signal(leerColapsado());
  /** Submenús desplegados */
  readonly abiertos = signal<Set<IdGrupo>>(new Set());
  /** Fincas del agricultor (accesos del submenú de Cultivos) */
  readonly fincas = signal<Finca[]>([]);
  private fincasCargadas = false;
  /** Menú completo abierto como cajón (solo celular) */
  readonly cajonAbierto = signal(false);
  /** Nóminas que esperan aprobación (contador del menú) */
  readonly nominasPendientes = signal(0);

  readonly subTrabajadores: ItemSubmenu[] = [
    { ruta: '/worker', clave: 'layout.nav.team', exacto: true },
    { ruta: '/worker/jornales', clave: 'layout.nav.wages' },
    { ruta: '/worker/nominas', clave: 'layout.nav.payrolls', contador: true },
    { ruta: '/worker/pagos', clave: 'layout.nav.payments' },
    { ruta: '/worker/cargos', clave: 'layout.nav.positions' },
    { ruta: '/worker/actividades', clave: 'layout.nav.activities' },
  ];

  readonly subReportes: ItemSubmenu[] = [
    { ruta: '/reportes', clave: 'layout.nav.reportPayroll', query: { tab: 'payroll' } },
    { ruta: '/reportes', clave: 'layout.nav.reportCrops', query: { tab: 'crops' } },
  ];

  subCultivos(): ItemSubmenu[] {
    return [
      { ruta: '/cultivo', clave: 'layout.nav.myFarms', exacto: true },
      ...this.fincas().slice(0, MAX_FINCAS_MENU).map((f) => ({ ruta: `/cultivo/finca/${f.id}`, texto: f.nombre })),
      { ruta: '/cultivo/nueva-finca', clave: 'layout.nav.newFarm', icono: 'ti-plus' },
    ];
  }

  constructor() {
    this.alNavegar(this.router.url);
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd), takeUntilDestroyed(inject(DestroyRef)))
      .subscribe((e) => this.alNavegar((e as NavigationEnd).urlAfterRedirects));
  }

  private alNavegar(url: string): void {
    this.cajonAbierto.set(false);
    const grupo = grupoDeUrl(url);
    if (grupo) this.abiertos.update((s) => new Set(s).add(grupo));
    // Las fincas se refrescan al moverse por Cultivos (pudo crearse o borrarse una)
    if (!this.fincasCargadas || grupo === 'cultivos') this.cargarFincas();
    this.cargarPendientes();
  }

  private cargarFincas(): void {
    const id = this.usuario?.id;
    if (id == null) return;
    this.fincasCargadas = true;
    this.cultivoService.listarFincasPorAgricultor(id).subscribe({
      next: (f) => this.fincas.set([...f].sort((a, b) => a.nombre.localeCompare(b.nombre))),
      error: () => this.fincas.set([]),
    });
  }

  abierto(g: IdGrupo): boolean {
    return this.abiertos().has(g);
  }

  /** El grupo contiene la página actual */
  enGrupo(g: IdGrupo): boolean {
    return grupoDeUrl(this.router.url) === g;
  }

  private cargarPendientes(): void {
    this.nominaService.listarTodas().subscribe({
      next: (n) => this.nominasPendientes.set(n.filter((x) => x.estado === 'PENDIENTE').length),
      error: () => this.nominasPendientes.set(0),
    });
  }

  alternarColapsado(): void {
    const valor = !this.colapsado();
    this.colapsado.set(valor);
    try { localStorage.setItem(CLAVE_COLAPSADO, String(valor)); } catch { /* sin almacenamiento */ }
  }

  alternar(g: IdGrupo): void {
    // Colapsado no hay espacio para el submenú: se va directo a la sección
    if (this.colapsado()) {
      this.router.navigate([RUTA_GRUPO[g]]);
      return;
    }
    this.abiertos.update((s) => {
      const n = new Set(s);
      n.has(g) ? n.delete(g) : n.add(g);
      return n;
    });
  }

  cambiarIdioma(lang: Lang): void {
    this.lang.set(lang);
  }

  iniciales(): string {
    const partes = (this.usuario?.nombre ?? '').trim().split(/\s+/).filter(Boolean);
    return ((partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? '')).toUpperCase() || '?';
  }

  @HostListener('document:keydown.escape')
  cerrarCajon(): void {
    this.cajonAbierto.set(false);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}

const RUTA_GRUPO: Record<IdGrupo, string> = { cultivos: '/cultivo', trabajadores: '/worker', reportes: '/reportes' };

function grupoDeUrl(url: string): IdGrupo | null {
  if (url.startsWith('/cultivo')) return 'cultivos';
  if (url.startsWith('/worker')) return 'trabajadores';
  if (url.startsWith('/reportes')) return 'reportes';
  return null;
}

function leerColapsado(): boolean {
  try { return localStorage.getItem(CLAVE_COLAPSADO) === 'true'; } catch { return false; }
}
