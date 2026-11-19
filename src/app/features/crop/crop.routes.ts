import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth-guard';

export const cultivoRoutes: Routes = [
  {
    path: '',
    title: 'cultivo.fincas.list.title',
    loadComponent: () => import('./farms/farm-list/farm-list').then(m => m.ListaFincasComponent),
    canActivate: [authGuard]
  },
  {
    path: 'calendar',
    title: 'temporadas.cal.title',
    loadComponent: () => import('./calendar/calendar').then(m => m.CalendarioComponent),
    canActivate: [authGuard]
  },
  {
    // Bodega de insumos (una por agricultor)
    path: 'inventory',
    title: 'inventario.title',
    loadComponent: () => import('./inventory/inventory').then(m => m.InventarioComponent),
    canActivate: [authGuard]
  },
  {
    path: 'new-farm',
    title: 'cultivo.fincas.new.title',
    loadComponent: () => import('./farms/new-farm/new-farm').then(m => m.NuevaFincaComponent),
    canActivate: [authGuard]
  },
  {
    path: 'farm/:id',
    title: 'titles.farm',
    loadComponent: () => import('./farms/farm-detail/farm-detail').then(m => m.DetalleFincaComponent),
    canActivate: [authGuard]
  },
  {
    path: 'farm/:fincaId/new-plot',
    title: 'lotes.new.title',
    loadComponent: () => import('./plots/new-plot/new-plot').then(m => m.NuevoLoteComponent),
    canActivate: [authGuard]
  },
  {
    path: 'plot/:id',
    title: 'temporadas.lote.eyebrow',
    loadComponent: () => import('./plots/plot-detail/plot-detail').then(m => m.DetalleLoteComponent),
    canActivate: [authGuard]
  },
  {
    path: 'farm/:fincaId/plot/:loteId/new-planting',
    title: 'siembra.new.title',
    loadComponent: () => import('./planting/new-planting/new-planting').then(m => m.NuevaSiembraComponent),
    canActivate: [authGuard]
  },
  {
    path: 'planting/:id/edit',
    title: 'temporadas.siembra.editTitle',
    loadComponent: () => import('./planting/new-planting/new-planting').then(m => m.NuevaSiembraComponent),
    canActivate: [authGuard]
  },
  {
    path: 'planting/:id',
    title: 'temporadas.ui.planting',
    loadComponent: () => import('./planting/planting-detail/planting-detail').then(m => m.DetalleSiembraComponent),
    canActivate: [authGuard],
    // Registrar o corregir una actividad, fumigación o cosecha se abre en un panel encima de la ficha
    // (la dirección cambia, así que atrás lo cierra; la ficha no se vuelve a cargar)
    children: [
      { path: 'activity', title: 'siembra.activity.title', loadComponent: () => import('./planting/log-activity/log-activity').then(m => m.RegistrarActividad) },
      { path: 'activity/:registroId', title: 'temporadas.registro.editActivity', loadComponent: () => import('./planting/log-activity/log-activity').then(m => m.RegistrarActividad) },
      { path: 'spraying', title: 'siembra.spray.title', loadComponent: () => import('./planting/log-spraying/log-spraying').then(m => m.RegistrarFumigacion) },
      { path: 'spraying/:registroId', title: 'temporadas.registro.editSpray', loadComponent: () => import('./planting/log-spraying/log-spraying').then(m => m.RegistrarFumigacion) },
      { path: 'harvest', title: 'siembra.harvest.title', loadComponent: () => import('./planting/log-harvest/log-harvest').then(m => m.RegistrarCosecha) },
      { path: 'harvest/:registroId', title: 'temporadas.registro.editHarvest', loadComponent: () => import('./planting/log-harvest/log-harvest').then(m => m.RegistrarCosecha) },
    ],
  }
];
