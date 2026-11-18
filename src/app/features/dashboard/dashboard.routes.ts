import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth-guard';

export const dashboardRoutes: Routes = [
  {
    path: '',
    title: 'layout.nav.home',
    loadComponent: () => import('./dashboard').then((m) => m.DashboardComponent),
    canActivate: [authGuard],
  },
];
