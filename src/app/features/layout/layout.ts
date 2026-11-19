import { Component, DestroyRef, ElementRef, HostListener, NgZone, afterNextRender, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { DecimalPipe, Location, NgTemplateOutlet, UpperCasePipe } from '@angular/common';
import { esDeslizarParaVolver } from './swipe-back';

/** Píxeles que hay que tirar hacia abajo (ya con resistencia) para actualizar la pantalla */
const DISTANCIA_ACTUALIZAR = 70;
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
import { ProgresoComponent } from './progress/progress';
import { AvisoComponent } from './toast/toast';
import { DeslizaCierraDirective } from '../../shared/swipe-close.directive';
import { CampanaComponent } from '../../shared/inbox-bell/inbox-bell';
import { abreTeclado, barraOcultaTras } from './scroll-bar';
import { vigilarEntradas } from './reveal';
import { consejoFumigacion, iconoClima, municipio } from '../../shared/weather';
import { iniciales as inicialesDe } from '../../shared/iniciales';

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
  /** Otra ruta que también marca esta opción como la actual (Labores, dentro de "Cargos y labores") */
  tambien?: string;
  /** Subtítulo dentro del submenú (no es un enlace) */
  titulo?: boolean;
}

/** Panel del agricultor: menú lateral claro, submenú de trabajadores y barra inferior en celular. */
@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterModule, TranslatePipe, UpperCasePipe, DecimalPipe, NgTemplateOutlet, BuscadorComponent, OfflineStatusComponent, ProgresoComponent, AvisoComponent, DeslizaCierraDirective, CampanaComponent],
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
  readonly iconoClima = computed(() => iconoClima(this.clima()?.iconUrl));
  /** En el Inicio el clima ya sale en grande: el menú no lo repite */
  readonly enInicio = signal(false);
  /** Ruta actual sin parámetros (para las opciones del menú que abarcan dos pantallas) */
  readonly ruta = signal('');
  /** Menú completo abierto como cajón (solo celular) */
  readonly cajonAbierto = signal(false);
  /** Celular: la barra inferior se esconde al bajar por la página y mientras se escribe en un campo */
  readonly barraOculta = signal(false);
  readonly escribiendo = signal(false);
  private ultimoY = 0;
  private relojTeclado: ReturnType<typeof setTimeout> | null = null;
  /** Nóminas que esperan aprobación (contador del menú) */
  readonly nominasPendientes = signal(0);

  readonly subTrabajadores: ItemSubmenu[] = [
    { ruta: '/worker', clave: 'layout.nav.team', exacto: true },
    { ruta: '/worker/workdays', clave: 'layout.nav.wages' },
    { ruta: '/worker/payrolls', clave: 'layout.nav.payrolls', contador: true },
    { ruta: '/worker/payments', clave: 'layout.nav.payments' },
    // Cargos y Labores van juntos (dos pestañas en la misma pantalla)
    { ruta: '/worker/positions', clave: 'layout.nav.catalog', tambien: '/worker/labors' },
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

    // Fuera de Angular: el desplazamiento dispara muchos eventos y solo interesa cuando cambia el estado
    const alDeslizar = () => this.seguirDesplazamiento();
    const zona = inject(NgZone);
    const raiz = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    let dejarDeVigilar = () => {};
    zona.runOutsideAngular(() => window.addEventListener('scroll', alDeslizar, { passive: true }));
    afterNextRender(() => {
      const contenido = raiz.querySelector<HTMLElement>('.main');
      if (contenido) dejarDeVigilar = zona.runOutsideAngular(() => vigilarEntradas(contenido));
    });
    inject(DestroyRef).onDestroy(() => {
      window.removeEventListener('scroll', alDeslizar);
      dejarDeVigilar();
      if (this.relojTeclado) clearTimeout(this.relojTeclado);
    });
  }

  private seguirDesplazamiento(): void {
    const ahora = window.scrollY;
    const maximo = document.documentElement.scrollHeight - window.innerHeight;
    const oculta = barraOcultaTras(this.barraOculta(), { antes: this.ultimoY, ahora, maximo });
    this.ultimoY = ahora;
    if (oculta !== this.barraOculta()) this.barraOculta.set(oculta);
  }

  /** Con el teclado abierto la barra estorba: se esconde hasta salir del campo */
  @HostListener('document:focusin', ['$event.target'])
  alEnfocar(el: EventTarget | null): void {
    if (!abreTeclado(el)) return;
    if (this.relojTeclado) clearTimeout(this.relojTeclado);
    this.relojTeclado = null;
    this.escribiendo.set(true);
  }

  // ── Celular (app instalada): deslizar desde el borde izquierdo vuelve a la pantalla anterior ──
  private readonly ubicacion = inject(Location);
  private toqueInicio: { x: number; y: number; t: number } | null = null;

  // ── Celular (app instalada): bajar el dedo desde arriba del todo actualiza la pantalla ──
  /** Cuánto se ha tirado hacia abajo (0 = nada); con más de DISTANCIA_ACTUALIZAR se actualiza al soltar */
  readonly tiron = signal(0);
  readonly distanciaActualizar = DISTANCIA_ACTUALIZAR;
  private tironInicio: number | null = null;

  /** En el navegador ya existen estos gestos (volver, actualizar): solo se agregan en la app instalada */
  private esAppInstalada(): boolean {
    return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
  }

  @HostListener('document:touchstart', ['$event'])
  alEmpezarToque(e: TouchEvent): void {
    const p = e.touches[0];
    const instalada = this.esAppInstalada() && window.innerWidth <= 760 && !this.cajonAbierto() && !document.body.classList.contains('con-panel');
    // Volver: desde el borde izquierdo
    this.toqueInicio = instalada && p && p.clientX <= 24 ? { x: p.clientX, y: p.clientY, t: Date.now() } : null;
    // Actualizar: con la página arriba del todo
    this.tironInicio = instalada && p && window.scrollY <= 0 ? p.clientY : null;
    if (this.tironInicio !== null) {
      this.zonaToques.runOutsideAngular(() => document.addEventListener('touchmove', this.moverToque, { passive: true }));
    }
  }

  private readonly zonaToques = inject(NgZone);
  /** Se escucha el movimiento solo mientras dura el gesto y fuera de Angular (no recalcula la pantalla en cada scroll) */
  private readonly moverToque = (e: TouchEvent) => this.alMoverToque(e);

  alMoverToque(e: TouchEvent): void {
    if (this.tironInicio === null) return;
    const dy = (e.touches[0]?.clientY ?? 0) - this.tironInicio;
    // Con resistencia: el indicador baja menos que el dedo
    this.tiron.set(dy > 0 && window.scrollY <= 0 ? Math.min(dy * 0.5, DISTANCIA_ACTUALIZAR * 1.4) : 0);
  }

  @HostListener('document:touchend', ['$event'])
  alTerminarToque(e: TouchEvent): void {
    const ini = this.toqueInicio;
    this.toqueInicio = null;
    const tiro = this.tiron();
    this.tironInicio = null;
    document.removeEventListener('touchmove', this.moverToque);
    this.tiron.set(0);
    if (tiro >= DISTANCIA_ACTUALIZAR) { window.location.reload(); return; }
    const p = e.changedTouches[0];
    if (!ini || !p || this.ruta() === '/dashboard') return;
    if (esDeslizarParaVolver(ini, { x: p.clientX, y: p.clientY, t: Date.now() })) this.ubicacion.back();
  }

  @HostListener('document:focusout')
  alDesenfocar(): void {
    if (!this.escribiendo()) return;
    // Un respiro: al pasar de un campo al siguiente no debe aparecer y desaparecer
    if (this.relojTeclado) clearTimeout(this.relojTeclado);
    this.relojTeclado = setTimeout(() => {
      this.relojTeclado = null;
      this.escribiendo.set(false);
    }, 150);
  }

  /** Tocar la pestaña en la que ya se está lleva al inicio de la página */
  tocarBarra(evento: Event): void {
    try {
      navigator.vibrate?.(6);
    } catch {
      // sin vibración
    }
    const enlace = (evento.target as HTMLElement | null)?.closest('a');
    if (!enlace || !enlace.classList.contains('on')) return;
    if (enlace.getAttribute('href') !== this.router.url.split('?')[0]) return;
    evento.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private alNavegar(url: string): void {
    this.ruta.set(url.split(/[?#]/)[0]);
    this.enInicio.set(this.ruta() === '/dashboard');
    this.cajonAbierto.set(false);
    this.barraOculta.set(false);
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
    // Solo el conteo por estado: antes se traían todas las nóminas para contarlas aquí
    this.nominaService.resumen().subscribe({
      next: (r) => this.nominasPendientes.set(r.find((x) => x.estado === 'PENDIENTE')?.cantidad ?? 0),
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
    return inicialesDe(this.usuario?.nombre);
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
