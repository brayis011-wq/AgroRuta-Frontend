import { Routes } from '@angular/router';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./admin-layout/admin-layout').then((m) => m.AdminLayoutComponent),
    children: [
      { path: '', redirectTo: 'summary', pathMatch: 'full' },
      {
        path: 'summary',
        loadComponent: () => import('./summary/admin-summary').then((m) => m.AdminResumenComponent),
      },
      {
        path: 'users',
        loadComponent: () => import('./users/admin-users').then((m) => m.AdminUsuariosComponent),
      },
      {
        path: 'farmers',
        loadComponent: () =>
          import('./farmers/admin-farmers').then((m) => m.AdminAgricultoresComponent),
      },
      {
        path: 'farmers/:id',
        loadComponent: () =>
          import('./farmer-detail/admin-farmer-detail').then(
            (m) => m.AdminAgricultorDetalleComponent,
          ),
      },
      {
        path: 'inputs',
        loadComponent: () => import('./inputs/admin-inputs').then((m) => m.AdminInsumosComponent),
      },
      {
        path: 'crops',
        loadComponent: () => import('./crops/admin-crops').then((m) => m.AdminCultivosComponent),
      },
      {
        path: 'backups',
        loadChildren: () => import('../backup/backup.routes').then((m) => m.BACKUP_ROUTES),
      },
      {
        path: 'account',
        loadChildren: () =>
          import('../configuration/configuration.routes').then((m) => m.configurationRoutes),
      },
    ],
  },
];
