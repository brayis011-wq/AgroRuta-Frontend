import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../core/services/auth';
import { AuthResponse } from '../../core/models/auth.model';
import { LanguageSwitcher } from '../../shared/language-switcher/language-switcher';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslatePipe, LanguageSwitcher],
  templateUrl: './layout.html',
  styleUrl: './layout.css',
})
export class LayoutComponent {
  usuario: AuthResponse | null = null;
  sidebarCollapsed = false;

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {
    this.usuario = this.authService.getUsuario();
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
