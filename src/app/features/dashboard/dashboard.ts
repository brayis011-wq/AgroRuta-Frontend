import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth';
import { AuthResponse } from '../../core/models/auth.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class DashboardComponent {
  usuario: AuthResponse | null = null;

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {
    this.usuario = this.authService.getUsuario();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
