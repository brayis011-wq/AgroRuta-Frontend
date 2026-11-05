import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth';
import { ProfileService } from '../../../core/services/profile.service';
import { LanguageSwitcher } from '../../../shared/language-switcher/language-switcher';

interface NavItem {
  ruta: string;
  icono: string;
  etiqueta: string;
}

interface NavSeccion {
  titulo: string;
  items: NavItem[];
}

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslatePipe, LanguageSwitcher],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.css',
})
export class AdminLayoutComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  readonly perfil = inject(ProfileService);

  constructor() {
    this.perfil.cargarFoto();
  }

  readonly usuario = this.authService.getUsuario();
  colapsado = false;

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

  alternarMenu(): void {
    this.colapsado = !this.colapsado;
  }

  cerrarSesion(): void {
    this.perfil.olvidarFoto();
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}
