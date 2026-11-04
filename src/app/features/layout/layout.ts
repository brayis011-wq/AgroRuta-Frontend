import { Component, DestroyRef, HostListener, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { UpperCasePipe } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { filter } from 'rxjs';
import { AuthService } from '../../core/services/auth';
import { AuthResponse } from '../../core/models/auth.model';
import { LanguageService, Lang } from '../../core/services/language.service';
import { NominaService } from '../../core/services/worker.service';

const CLAVE_COLAPSADO = 'sidebarColapsado';

/** Panel del agricultor: menú lateral claro, submenú de trabajadores y barra inferior en celular. */
@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterModule, TranslatePipe, UpperCasePipe],
  templateUrl: './layout.html',
  styleUrls: ['./layout.css', './layout-movil.css'],
})
export class LayoutComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly nominaService = inject(NominaService);
  readonly lang = inject(LanguageService);

  readonly usuario: AuthResponse | null = this.authService.getUsuario();
  readonly colapsado = signal(leerColapsado());
  /** Submenú de Trabajadores desplegado */
  readonly trabajadoresAbierto = signal(false);
  /** Menú completo abierto como cajón (solo celular) */
  readonly cajonAbierto = signal(false);
  /** Nóminas que esperan aprobación (contador del menú) */
  readonly nominasPendientes = signal(0);

  readonly subTrabajadores = [
    { ruta: '/worker', clave: 'layout.nav.team', exacto: true },
    { ruta: '/worker/jornales', clave: 'layout.nav.wages', exacto: false },
    { ruta: '/worker/nominas', clave: 'layout.nav.payrolls', exacto: false, contador: true },
    { ruta: '/worker/pagos', clave: 'layout.nav.payments', exacto: false },
    { ruta: '/worker/cargos', clave: 'layout.nav.positions', exacto: false },
    { ruta: '/worker/actividades', clave: 'layout.nav.activities', exacto: false },
  ];

  constructor() {
    this.alNavegar(this.router.url);
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd), takeUntilDestroyed(inject(DestroyRef)))
      .subscribe((e) => this.alNavegar((e as NavigationEnd).urlAfterRedirects));
  }

  private alNavegar(url: string): void {
    this.cajonAbierto.set(false);
    if (url.startsWith('/worker')) this.trabajadoresAbierto.set(true);
    this.cargarPendientes();
  }

  private cargarPendientes(): void {
    this.nominaService.listarTodas().subscribe({
      next: (n) => this.nominasPendientes.set(n.filter((x) => x.estado === 'PENDIENTE').length),
      error: () => this.nominasPendientes.set(0),
    });
  }

  enTrabajadores(): boolean {
    return this.router.url.startsWith('/worker');
  }

  alternarColapsado(): void {
    const valor = !this.colapsado();
    this.colapsado.set(valor);
    try { localStorage.setItem(CLAVE_COLAPSADO, String(valor)); } catch { /* sin almacenamiento */ }
  }

  alternarTrabajadores(): void {
    // Colapsado no hay espacio para el submenú: se va directo al equipo
    if (this.colapsado()) {
      this.router.navigate(['/worker']);
      return;
    }
    this.trabajadoresAbierto.update((v) => !v);
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

function leerColapsado(): boolean {
  try { return localStorage.getItem(CLAVE_COLAPSADO) === 'true'; } catch { return false; }
}
