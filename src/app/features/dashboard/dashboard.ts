import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth';
import { AuthResponse } from '../../core/models/auth.model';
import { CultivoService } from '../../core/services/cultivo.service';
import { WeatherWidgetComponent } from '../weather/weather-widget/weather-widget.component';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, DatePipe, DecimalPipe, WeatherWidgetComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class DashboardComponent implements OnInit {

  private authService   = inject(AuthService);
  private cultivoService = inject(CultivoService);
  private router        = inject(Router);
  private cdr           = inject(ChangeDetectorRef);

  usuario: AuthResponse | null = null;
  today = new Date();

  cargandoStats = true;
  totalFincas   = 0;
  totalHectareas = 0;
  totalLotes    = 0;

  ngOnInit(): void {
    this.usuario = this.authService.getUsuario();
    this.cargarStats();
  }

  cargarStats(): void {
    const usuarioId = this.usuario?.id;
    if (!usuarioId) { this.cargandoStats = false; return; }

    this.cultivoService.listarFincasPorAgricultor(usuarioId).pipe(
      switchMap(fincas => {
        this.totalFincas    = fincas.length;
        this.totalHectareas = fincas.reduce((s, f) => s + (f.hectareas ?? 0), 0);

        const lotes$ = fincas.length > 0
          ? forkJoin(fincas.map(f =>
              this.cultivoService.listarLotesPorFinca(f.id!).pipe(catchError(() => of([])))
            ))
          : of([]);

        return lotes$;
      }),
      catchError(() => of([]))
    ).subscribe({
      next: (resultados) => {
        this.totalLotes    = (resultados as any[][]).reduce((s, lotes) => s + lotes.length, 0);
        this.cargandoStats = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.cargandoStats = false;
        this.cdr.detectChanges();
      }
    });
  }

  irA(ruta: string): void { this.router.navigate([ruta]); }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
