import { Component, DestroyRef, inject, signal } from '@angular/core';
import { UpperCasePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth';
import { LanguageService } from '../../../core/services/language.service';
import { ProfileService } from '../../../core/services/profile.service';
import { TemaService } from '../../../core/services/tema.service';

interface NavItem {
  ruta: string;
  icono: string;
  etiqueta: string;
}

interface NavSeccion {
  titulo: string;
  items: NavItem[];
}

const CLAVE_COLAPSADO = 'admin-menu-colapsado';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterModule, TranslatePipe, UpperCasePipe],
  templateUrl: './admin-layout.html',
  styleUrls: ['../../layout/layout.css', '../../layout/layout-movil.css', './admin-layout.css'],
})
export class AdminLayoutComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  readonly perfil = inject(ProfileService);
  readonly tema = inject(TemaService);
  readonly lang = inject(LanguageService);

  readonly usuario = this.authService.getUsuario();
  readonly colapsado = signal(leerColapsado());
  readonly cajonAbierto = signal(false);

  readonly secciones: NavSeccion[] = [
    {
      titulo: 'admin.nav.sections.panel',
      items: [{ ruta: 'resumen', icono: 'ti-layout-dashboard', etiqueta: 'admin.nav.summary' }],
    },
    {
      titulo: 'admin.nav.sections.management',
      items: [
        { ruta: 'usuarios', icono: 'ti-users', etiqueta: 'admin.nav.users' },
        { ruta: 'agricultores', icono: 'ti-plant-2', etiqueta: 'admin.nav.farmers' },
        { ruta: 'cultivos', icono: 'ti-seeding', etiqueta: 'admin.nav.crops' },
        { ruta: 'insumos', icono: 'ti-flask', etiqueta: 'admin.nav.inputs' },
      ],
    },
    {
      titulo: 'admin.nav.sections.system',
      items: [
        { ruta: 'backups', icono: 'ti-database', etiqueta: 'admin.nav.backups' },
        { ruta: 'cuenta', icono: 'ti-user-cog', etiqueta: 'admin.nav.account' },
      ],
    },
  ];

  constructor() {
    this.perfil.cargarFoto();
    // En el celular el menú se cierra solo al cambiar de página
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd), takeUntilDestroyed(inject(DestroyRef)))
      .subscribe(() => this.cajonAbierto.set(false));
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
    this.router.navigate(['/auth/login']);
  }
}

function leerColapsado(): boolean {
  try { return localStorage.getItem(CLAVE_COLAPSADO) === 'true'; } catch { return false; }
}
