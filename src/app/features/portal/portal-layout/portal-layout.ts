import { Component, OnInit, inject } from '@angular/core';
import { AsyncPipe, CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth';
import { PortalService } from '../../../core/services/portal.service';
import { LanguageSwitcher } from '../../../shared/language-switcher/language-switcher';

@Component({
  selector: 'app-portal-layout',
  standalone: true,
  imports: [CommonModule, AsyncPipe, RouterModule, TranslatePipe, LanguageSwitcher],
  templateUrl: './portal-layout.html',
  styleUrl: './portal-layout.css',
})
export class PortalLayoutComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  readonly portal = inject(PortalService);

  readonly usuario = this.authService.getUsuario();
  errorEstado = false;

  readonly pestanas = [
    { ruta: 'inicio', icono: 'ti-home', etiqueta: 'portal.nav.home', soloAprobado: false },
    { ruta: 'jornales', icono: 'ti-calendar-event', etiqueta: 'portal.nav.wages', soloAprobado: true },
    { ruta: 'nominas', icono: 'ti-receipt-2', etiqueta: 'portal.nav.rosters', soloAprobado: true },
    { ruta: 'pagos', icono: 'ti-cash', etiqueta: 'portal.nav.payments', soloAprobado: true },
    { ruta: 'cuenta', icono: 'ti-user-cog', etiqueta: 'portal.nav.account', soloAprobado: false },
  ];

  ngOnInit(): void {
    this.portal.cargarEstado().subscribe({ error: () => (this.errorEstado = true) });
  }

  cerrarSesion(): void {
    this.authService.logout();
    this.portal.estado$.next(null);
    this.router.navigate(['/auth/login']);
  }
}
