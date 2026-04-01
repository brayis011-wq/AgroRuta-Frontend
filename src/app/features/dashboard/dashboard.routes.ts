import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth-guard';

export const dashboardRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./dashboard').then((m) => m.DashboardComponent),
    canActivate: [authGuard],
  },
];
