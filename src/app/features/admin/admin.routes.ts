import { Routes } from '@angular/router';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./admin-layout/admin-layout').then((m) => m.AdminLayoutComponent),
    children: [
      { path: '', redirectTo: 'summary', pathMatch: 'full' },
      {
        path: 'summary',
        title: 'admin.summary.title',
        loadComponent: () => import('./summary/admin-summary').then((m) => m.AdminResumenComponent),
      },
      {
        path: 'users',
        title: 'admin.users.title',
        loadComponent: () => import('./users/admin-users').then((m) => m.AdminUsuariosComponent),
      },
      {
        path: 'farmers',
        title: 'admin.farmers.title',
        loadComponent: () =>
          import('./farmers/admin-farmers').then((m) => m.AdminAgricultoresComponent),
      },
      {
        path: 'farmers/:id',
        title: 'titles.farmer',
        loadComponent: () =>
          import('./farmer-detail/admin-farmer-detail').then(
            (m) => m.AdminAgricultorDetalleComponent,
          ),
      },
      {
        path: 'inputs',
        title: 'admin.inputs.title',
        loadComponent: () => import('./inputs/admin-inputs').then((m) => m.AdminInsumosComponent),
      },
      {
        path: 'crops',
        title: 'admin.crops.title',
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
