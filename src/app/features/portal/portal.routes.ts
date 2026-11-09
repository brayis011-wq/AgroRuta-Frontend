import { Routes } from '@angular/router';

export const PORTAL_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./portal-layout/portal-layout').then((m) => m.PortalLayoutComponent),
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      { path: 'home', loadComponent: () => import('./home/portal-home').then((m) => m.PortalInicioComponent) },
      { path: 'workdays', loadComponent: () => import('./workdays/portal-workdays').then((m) => m.PortalJornalesComponent) },
      { path: 'payrolls', loadComponent: () => import('./payrolls/portal-payrolls').then((m) => m.PortalNominasComponent) },
      { path: 'payments', loadComponent: () => import('./payments/portal-payments').then((m) => m.PortalPagosComponent) },
      {
        path: 'account',
        loadChildren: () =>
          import('../configuration/configuration.routes').then((m) => m.configurationRoutes),
      },
    ],
  },
];
