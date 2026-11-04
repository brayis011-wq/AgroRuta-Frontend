import { Routes } from '@angular/router';

export const PORTAL_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./portal-layout/portal-layout').then((m) => m.PortalLayoutComponent),
    children: [
      { path: '', redirectTo: 'inicio', pathMatch: 'full' },
      { path: 'inicio', loadComponent: () => import('./inicio/portal-inicio').then((m) => m.PortalInicioComponent) },
      { path: 'jornales', loadComponent: () => import('./jornales/portal-jornales').then((m) => m.PortalJornalesComponent) },
      { path: 'nominas', loadComponent: () => import('./nominas/portal-nominas').then((m) => m.PortalNominasComponent) },
      { path: 'pagos', loadComponent: () => import('./pagos/portal-pagos').then((m) => m.PortalPagosComponent) },
      {
        path: 'cuenta',
        loadChildren: () =>
          import('../configuration/configuration.routes').then((m) => m.configurationRoutes),
      },
    ],
  },
];
