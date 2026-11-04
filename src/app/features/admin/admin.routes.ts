import { Routes } from '@angular/router';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./admin-layout/admin-layout').then((m) => m.AdminLayoutComponent),
    children: [
      { path: '', redirectTo: 'resumen', pathMatch: 'full' },
      {
        path: 'resumen',
        loadComponent: () => import('./resumen/admin-resumen').then((m) => m.AdminResumenComponent),
      },
      {
        path: 'usuarios',
        loadComponent: () => import('./usuarios/admin-usuarios').then((m) => m.AdminUsuariosComponent),
      },
      {
        path: 'agricultores',
        loadComponent: () =>
          import('./agricultores/admin-agricultores').then((m) => m.AdminAgricultoresComponent),
      },
      {
        path: 'agricultores/:id',
        loadComponent: () =>
          import('./agricultor-detalle/admin-agricultor-detalle').then(
            (m) => m.AdminAgricultorDetalleComponent,
          ),
      },
      {
        path: 'insumos',
        loadComponent: () => import('./insumos/admin-insumos').then((m) => m.AdminInsumosComponent),
      },
      {
        path: 'cultivos',
        loadComponent: () => import('./cultivos/admin-cultivos').then((m) => m.AdminCultivosComponent),
      },
      {
        path: 'backups',
        loadChildren: () => import('../backup/backup.routes').then((m) => m.BACKUP_ROUTES),
      },
      {
        path: 'cuenta',
        loadChildren: () =>
          import('../configuration/configuration.routes').then((m) => m.configurationRoutes),
      },
    ],
  },
];
