// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';

export const routes: Routes = [
  { path: '', redirectTo: 'auth/login', pathMatch: 'full' },

  // Rutas públicas
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.authRoutes),
  },

  // Rutas protegidas bajo el Layout (sidebar persistente)
  {
    path: '',
    loadComponent: () => import('./features/layout/layout').then((m) => m.LayoutComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadChildren: () => import('./features/dashboard/dashboard.routes').then((m) => m.dashboardRoutes),
      },
      {
        path: 'cultivo',
        loadChildren: () => import('./features/cultivo/cultivo.routes').then((m) => m.cultivoRoutes),
      },
      {
        path: 'worker',
        loadChildren: () => import('./features/worker/worker.routes').then((m) => m.workerRoutes),
      },
      // Rutas sin módulo aún — redirigen al dashboard sin salir de la app
      { path: 'reportes',      redirectTo: 'dashboard' },
      { path: 'configuracion', redirectTo: 'dashboard' },
    ],
  },

  // Fallback — redirige al dashboard en vez de login
  { path: '**', redirectTo: 'dashboard' },
];
