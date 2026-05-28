// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';

export const routes: Routes = [
  { path: '', redirectTo: 'auth/login', pathMatch: 'full' },

  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.authRoutes),
  },

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
      {
        path: 'reportes',
        loadChildren: () => import('./features/report/report.routes').then(m => m.REPORT_ROUTES),
        runGuardsAndResolvers: 'always'
      },
      {
        path: 'configuracion',
        loadChildren: () =>
          import('./features/configuration/configuration.routes').then((m) => m.configurationRoutes),
      },
    ],                           // ← cierra children[]
  },                             // ← cierra el objeto de ruta layout

  { path: '**', redirectTo: 'dashboard' },
];
