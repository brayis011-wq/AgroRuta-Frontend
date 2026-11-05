import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { AsyncPipe, UpperCasePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth';
import { LanguageService } from '../../../core/services/language.service';
import { PortalService } from '../../../core/services/portal.service';
import { ProfileService } from '../../../core/services/profile.service';
import { TemaService } from '../../../core/services/tema.service';

const CLAVE_COLAPSADO = 'portal-menu-colapsado';

@Component({
  selector: 'app-portal-layout',
  standalone: true,
  imports: [AsyncPipe, UpperCasePipe, RouterModule, TranslatePipe],
  templateUrl: './portal-layout.html',
  styleUrls: ['../../layout/layout.css', '../../layout/layout-movil.css', './portal-layout.css'],
})
export class PortalLayoutComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  readonly portal = inject(PortalService);
  readonly perfil = inject(ProfileService);
  readonly tema = inject(TemaService);
  readonly lang = inject(LanguageService);

  readonly usuario = this.authService.getUsuario();
  readonly colapsado = signal(leerColapsado());
  readonly cajonAbierto = signal(false);
  /** Nóminas aprobadas o pendientes que todavía no le han pagado (contador del menú) */
  readonly porCobrar = signal(0);
  errorEstado = false;

  readonly pestanas = [
    { ruta: 'inicio', icono: 'ti-home', etiqueta: 'portal.nav.home', soloAprobado: false },
    { ruta: 'jornales', icono: 'ti-calendar-event', etiqueta: 'portal.nav.wages', soloAprobado: true },
    { ruta: 'nominas', icono: 'ti-receipt-2', etiqueta: 'portal.nav.rosters', soloAprobado: true },
    { ruta: 'pagos', icono: 'ti-cash', etiqueta: 'portal.nav.payments', soloAprobado: true },
  ];

  constructor() {
    this.perfil.cargarFoto();
    // En el celular el menú se cierra solo al cambiar de página
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd), takeUntilDestroyed(inject(DestroyRef)))
      .subscribe(() => this.cajonAbierto.set(false));
  }

  ngOnInit(): void {
    this.errorEstado = false;
    this.portal.cargarEstado().subscribe({
      next: (e) => {
        if (e?.estado === 'APROBADO') this.contarPorCobrar();
      },
      error: () => (this.errorEstado = true),
    });
  }

  private contarPorCobrar(): void {
    this.portal.nominas().subscribe({
      next: (lista) => this.porCobrar.set(lista.filter((n) => n.estado === 'PENDIENTE' || n.estado === 'APROBADA').length),
      error: () => this.porCobrar.set(0),
    });
  }

  iniciales(): string {
    const partes = (this.usuario?.nombre ?? '').trim().split(/\s+/).filter(Boolean);
    return ((partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? '')).toUpperCase() || '?';
  }

  alternarColapsado(): void {
    const valor = !this.colapsado();
    this.colapsado.set(valor);
    try { localStorage.setItem(CLAVE_COLAPSADO, String(valor)); } catch { /* sin almacenamiento */ }
  }

  cerrarSesion(): void {
    this.perfil.olvidarFoto();
    this.authService.logout();
    this.portal.estado$.next(null);
    this.router.navigate(['/auth/login']);
  }
}

function leerColapsado(): boolean {
  try { return localStorage.getItem(CLAVE_COLAPSADO) === 'true'; } catch { return false; }
}
