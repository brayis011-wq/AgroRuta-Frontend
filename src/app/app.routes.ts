// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';
import { adminGuard } from './core/guards/admin-guard';
import { areaAgricultorGuard, trabajadorGuard } from './core/guards/role-guards';
import { rutasAntiguasGuard } from './core/guards/legacy-routes-guard';
export const routes: Routes = [
  { path: '', redirectTo: 'auth/login', pathMatch: 'full' },

  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.authRoutes),
  },

  // Pública: la pide Google para usar la API de Gmail
  {
    path: 'privacy',
    loadComponent: () => import('./features/legal/privacy').then((m) => m.PrivacidadComponent),
  },

  // Panel de administración: layout y menú propios
  {
    path: 'admin',
    canActivate: [authGuard, adminGuard],
    loadChildren: () => import('./features/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
  },

  // Portal del trabajador: solo lectura de sus jornales, nóminas y pagos
  {
    path: 'portal',
    canActivate: [authGuard, trabajadorGuard],
    loadChildren: () => import('./features/portal/portal.routes').then((m) => m.PORTAL_ROUTES),
  },

  {
    path: '',
    loadComponent: () => import('./features/layout/layout').then((m) => m.LayoutComponent),
    canActivate: [authGuard, areaAgricultorGuard],
    children: [
      {
        path: 'dashboard',
        loadChildren: () => import('./features/dashboard/dashboard.routes').then((m) => m.dashboardRoutes),
      },
      {
        path: 'crops',
        loadChildren: () => import('./features/crop/crop.routes').then((m) => m.cultivoRoutes),
      },
      {
        path: 'worker',
        loadChildren: () => import('./features/worker/worker.routes').then((m) => m.workerRoutes),
      },
      {
        path: 'reports',
        loadChildren: () => import('./features/report/report.routes').then(m => m.REPORT_ROUTES),
        runGuardsAndResolvers: 'always'
      },
      {
        path: 'settings',
        loadChildren: () =>
          import('./features/configuration/configuration.routes').then((m) => m.configurationRoutes),
      },
    ],                           // ← cierra children[]
  },                             // ← cierra el objeto de ruta layout

  // URLs viejas en español (marcadores, correos ya enviados): se traducen; lo demás va al inicio
  { path: '**', canActivate: [rutasAntiguasGuard], children: [] },
];
