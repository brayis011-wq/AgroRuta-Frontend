import { Component, DestroyRef, HostListener, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { DecimalPipe, NgTemplateOutlet, UpperCasePipe } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { filter } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { AuthResponse } from '../../core/models/auth.model';
import { LanguageService, Lang } from '../../core/services/language.service';
import { ProfileService } from '../../core/services/profile.service';
import { TemaService } from '../../core/services/theme.service';
import { NominaService } from '../../core/services/worker.service';
import { FincaActivaService } from '../../core/services/active-farm.service';
import { WeatherService } from '../../core/services/weather.service';
import { Weather } from '../../core/models/weather.model';
import { BuscadorComponent } from '../../shared/search/search';
import { OfflineStatusComponent } from './offline-status/offline-status';
import { consejoFumigacion, municipio } from '../../shared/weather';

const CLAVE_COLAPSADO = 'sidebarColapsado';
/** Lotes de la finca activa que se muestran en el submenú de Cultivos */
const MAX_LOTES_MENU = 8;

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
  /** Subtítulo dentro del submenú (no es un enlace) */
  titulo?: boolean;
}

/** Panel del agricultor: menú lateral claro, submenú de trabajadores y barra inferior en celular. */
@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterModule, TranslatePipe, UpperCasePipe, DecimalPipe, NgTemplateOutlet, BuscadorComponent, OfflineStatusComponent],
  templateUrl: './layout.html',
  styleUrls: ['./layout.css', './layout-movil.css', './layout-extras.css', './layout-anim.css'],
})
export class LayoutComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly nominaService = inject(NominaService);
  private readonly weatherService = inject(WeatherService);
  readonly fincaActiva = inject(FincaActivaService);
  readonly lang = inject(LanguageService);
  readonly perfil = inject(ProfileService);
  readonly tema = inject(TemaService);

  readonly usuario: AuthResponse | null = this.authService.getUsuario();
  readonly colapsado = signal(leerColapsado());
  /** Submenús desplegados */
  readonly abiertos = signal<Set<IdGrupo>>(new Set());
  readonly municipioDe = municipio;

  /** Menú del selector de finca desplegado */
  readonly menuFincas = signal(false);
  private fincasCargadas = false;

  /** Clima de la finca activa (o de la primera con ubicación) */
  readonly clima = signal<Weather | null>(null);
  readonly lugarClima = computed(() => municipio(this.fincaActiva.paraClima()) || this.clima()?.city || '');
  readonly consejo = computed(() => { const c = this.clima(); return c ? consejoFumigacion(c) : null; });
  /** Menú completo abierto como cajón (solo celular) */
  readonly cajonAbierto = signal(false);
  /** Nóminas que esperan aprobación (contador del menú) */
  readonly nominasPendientes = signal(0);

  readonly subTrabajadores: ItemSubmenu[] = [
    { ruta: '/worker', clave: 'layout.nav.team', exacto: true },
    { ruta: '/worker/workdays', clave: 'layout.nav.wages' },
    { ruta: '/worker/payrolls', clave: 'layout.nav.payrolls', contador: true },
    { ruta: '/worker/payments', clave: 'layout.nav.payments' },
    { ruta: '/worker/positions', clave: 'layout.nav.positions' },
    { ruta: '/worker/labors', clave: 'layout.nav.activities' },
  ];

  readonly subReportes: ItemSubmenu[] = [
    { ruta: '/reports', clave: 'layout.nav.reportPayroll', query: { tab: 'payroll' } },
    { ruta: '/reports', clave: 'layout.nav.reportCrops', query: { tab: 'crops' } },
    { ruta: '/reports', clave: 'reports.tabs.costs.name', query: { tab: 'costs' } },
    { ruta: '/reports', clave: 'reports.tabs.profitability.name', query: { tab: 'profitability' } },
  ];

  /**
   * Mis fincas + los lotes de la finca elegida en el selector.
   * Las fincas y "Nueva finca" viven solo en el selector, para no repetirlas.
   */
  subCultivos(): ItemSubmenu[] {
    const finca = this.fincaActiva.activa();
    const items: ItemSubmenu[] = [
      { ruta: '/crops', clave: 'layout.nav.myFarms', exacto: true },
      { ruta: '/crops/inventory', clave: 'inventario.nav', exacto: true },
    ];
    if (finca) {
      items.push({ ruta: `/crops/farm/${finca.id}`, clave: 'layout.nav.farmSummary', exacto: true });
      items.push({ ruta: '/crops/calendar', clave: 'temporadas.cal.menu', exacto: true });
      const lotes = this.fincaActiva.lotes();
      if (lotes.length) {
        items.push({ ruta: '#lotes', titulo: true, clave: 'layout.nav.plots' });
        items.push(...lotes.slice(0, MAX_LOTES_MENU).map((l) => ({ ruta: `/crops/plot/${l.id}`, texto: l.nombre, icono: 'ti-point-filled' })));
      }
    }
    return items;
  }

  constructor() {
    this.perfil.cargarFoto();
    // El clima sigue a la finca elegida
    effect(() => this.cargarClima(this.fincaActiva.paraClima()));
    this.alNavegar(this.router.url);
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd), takeUntilDestroyed(inject(DestroyRef)))
      .subscribe((e) => this.alNavegar((e as NavigationEnd).urlAfterRedirects));
  }

  private alNavegar(url: string): void {
    this.cajonAbierto.set(false);
    this.menuFincas.set(false);
    const grupo = grupoDeUrl(url);
    if (grupo) this.abiertos.update((s) => new Set(s).add(grupo));
    // Las fincas se refrescan al moverse por Cultivos (pudo crearse o borrarse una)
    if (!this.fincasCargadas) this.cargarFincas();
    // En Cultivos se refrescan los lotes (pudo crearse o borrarse uno)
    else if (grupo === 'cultivos') this.fincaActiva.refrescarLotes();
    this.cargarPendientes();
  }

  private cargarFincas(): void {
    this.fincasCargadas = true;
    this.fincaActiva.cargar();
  }

  private cargarClima(f: { centroideLat?: number; centroideLng?: number; ubicacion?: string } | null): void {
    if (!f) { this.clima.set(null); return; }
    const obs = f.centroideLat != null && f.centroideLng != null
      ? this.weatherService.getByCoordinates(f.centroideLat, f.centroideLng)
      : municipio(f as { ubicacion: string })
        ? this.weatherService.getByCity(municipio(f as { ubicacion: string }))
        : null;
    if (!obs) { this.clima.set(null); return; }
    obs.subscribe({ next: (w) => this.clima.set(w), error: () => this.clima.set(null) });
  }

  /** Elige finca en el selector; con una finca concreta se abre su página */
  elegirFinca(id: number | null): void {
    this.fincaActiva.elegir(id);
    this.menuFincas.set(false);
    this.router.navigate(id == null ? ['/crops'] : ['/crops/farm', id]);
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
    this.menuFincas.set(false);
  }

  logout(): void {
    this.perfil.olvidarFoto();
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}

const RUTA_GRUPO: Record<IdGrupo, string> = { cultivos: '/crops', trabajadores: '/worker', reportes: '/reports' };

function grupoDeUrl(url: string): IdGrupo | null {
  if (url.startsWith('/crops')) return 'cultivos';
  if (url.startsWith('/worker')) return 'trabajadores';
  if (url.startsWith('/reports')) return 'reportes';
  return null;
}

function leerColapsado(): boolean {
  try { return localStorage.getItem(CLAVE_COLAPSADO) === 'true'; } catch { return false; }
}
