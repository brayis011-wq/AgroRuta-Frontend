import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth-guard';

export const cultivoRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./farms/farm-list/farm-list').then(m => m.ListaFincasComponent),
    canActivate: [authGuard]
  },
  {
    path: 'calendar',
    loadComponent: () => import('./calendar/calendar').then(m => m.CalendarioComponent),
    canActivate: [authGuard]
  },
  {
    // Bodega de insumos (una por agricultor)
    path: 'inventory',
    loadComponent: () => import('./inventory/inventory').then(m => m.InventarioComponent),
    canActivate: [authGuard]
  },
  {
    path: 'new-farm',
    loadComponent: () => import('./farms/new-farm/new-farm').then(m => m.NuevaFincaComponent),
    canActivate: [authGuard]
  },
  {
    path: 'farm/:id',
    loadComponent: () => import('./farms/farm-detail/farm-detail').then(m => m.DetalleFincaComponent),
    canActivate: [authGuard]
  },
  {
    path: 'farm/:fincaId/new-plot',
    loadComponent: () => import('./plots/new-plot/new-plot').then(m => m.NuevoLoteComponent),
    canActivate: [authGuard]
  },
  {
    path: 'plot/:id',
    loadComponent: () => import('./plots/plot-detail/plot-detail').then(m => m.DetalleLoteComponent),
    canActivate: [authGuard]
  },
  {
    path: 'farm/:fincaId/plot/:loteId/new-planting',
    loadComponent: () => import('./planting/new-planting/new-planting').then(m => m.NuevaSiembraComponent),
    canActivate: [authGuard]
  },
  {
    path: 'planting/:id',
    loadComponent: () => import('./planting/planting-detail/planting-detail').then(m => m.DetalleSiembraComponent),
    canActivate: [authGuard]
  },
  {
    path: 'planting/:id/edit',
    loadComponent: () => import('./planting/new-planting/new-planting').then(m => m.NuevaSiembraComponent),
    canActivate: [authGuard]
  },
  {
    path: 'planting/:id/activity/:registroId',
    loadComponent: () => import('./planting/log-activity/log-activity').then(m => m.RegistrarActividad),
    canActivate: [authGuard]
  },
  {
    path: 'planting/:id/spraying/:registroId',
    loadComponent: () => import('./planting/log-spraying/log-spraying').then(m => m.RegistrarFumigacion),
    canActivate: [authGuard]
  },
  {
    path: 'planting/:id/harvest/:registroId',
    loadComponent: () => import('./planting/log-harvest/log-harvest').then(m => m.RegistrarCosecha),
    canActivate: [authGuard]
  },
  {
    path: 'planting/:id/activity',
    loadComponent: () => import('./planting/log-activity/log-activity').then(m => m.RegistrarActividad),
    canActivate: [authGuard]
  },
  {
    path: 'planting/:id/spraying',
    loadComponent: () => import('./planting/log-spraying/log-spraying').then(m => m.RegistrarFumigacion),
    canActivate: [authGuard]
  },
  {
    path: 'planting/:id/harvest',
    loadComponent: () => import('./planting/log-harvest/log-harvest').then(m => m.RegistrarCosecha),
    canActivate: [authGuard]
  }
];
