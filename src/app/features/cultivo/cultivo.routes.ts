import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth-guard';

export const cultivoRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./fincas/lista-fincas/lista-fincas').then(m => m.ListaFincasComponent),
    canActivate: [authGuard]
  },
  {
    path: 'finca/:id',
    loadComponent: () => import('./fincas/detalle-finca/detalle-finca').then(m => m.DetalleFincaComponent),
    canActivate: [authGuard]
  },
  {
    path: 'lote/:id',
    loadComponent: () => import('./lotes/detalle-lote/detalle-lote').then(m => m.DetalleLoteComponent),
    canActivate: [authGuard]
  },
  {
    path: 'siembra/:id',
    loadComponent: () => import('./siembra/detalle-siembra/detalle-siembra').then(m => m.DetalleSiembraComponent),
    canActivate: [authGuard]
  },
  {
    path: 'siembra/:id/actividad',
    loadComponent: () => import('./siembra/registrar-actividad/registrar-actividad').then(m => m.RegistrarActividad),
    canActivate: [authGuard]
  },
  {
    path: 'siembra/:id/fumigacion',
    loadComponent: () => import('./siembra/registrar-fumigacion/registrar-fumigacion').then(m => m.RegistrarFumigacion),
    canActivate: [authGuard]
  },
  {
    path: 'siembra/:id/cosecha',
    loadComponent: () => import('./siembra/registrar-cosecha/registrar-cosecha').then(m => m.RegistrarCosecha),
    canActivate: [authGuard]
  }
];
