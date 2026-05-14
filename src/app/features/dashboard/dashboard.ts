import { Component } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth';
import { AuthResponse } from '../../core/models/auth.model';
import { WeatherWidgetComponent } from '../weather/weather-widget/weather-widget.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, DatePipe, WeatherWidgetComponent],
 templateUrl: './dashboard.html',
   styleUrl: './dashboard.css'
})
export class DashboardComponent {
  usuario: AuthResponse | null = null;
  today = new Date();

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

  irA(ruta: string): void {
    this.router.navigate([ruta]);
  }
}
