import { Routes } from '@angular/router';

export const workerRoutes: Routes = [
  // ── Pantalla principal: lista de trabajadores + panel detalle
  {
    path: '',
    loadComponent: () =>
      import('./worker-home/worker-home').then((m) => m.WorkerHomeComponent),
  },

  // ── Actividades
  {
    path: 'actividades',
    loadComponent: () =>
      import('./activities/list-activities').then((m) => m.ListaActividadesComponent),
  },

  // ── Cargos
  {
    path: 'cargos',
    loadComponent: () =>
      import('./post/List-post').then((m) => m.ListaCargosComponent),
  },

  // ── Nóminas global (ver todas, aprobar, eliminar) — SIN generar aquí
  {
    path: 'nominas',
    loadComponent: () =>
      import('./roster/list-roster/list-roster').then((m) => m.ListaNominasComponent),
  },
  {
    path: 'nominas/:id',
    loadComponent: () =>
      import('./roster/detail-roster/detail-roster').then((m) => m.DetalleNominaComponent),
  },

  // ── Jornales
  {
    path: 'jornales/nuevo',
    loadComponent: () =>
      import('./wage/new-wage/new-wage').then((m) => m.NuevoJornalComponent),
  },
  {
    path: 'jornales',
    loadComponent: () =>
      import('./wage/list-wage/list-wage').then((m) => m.ListaJornalesComponent),
  },

  // ── Pagos
  {
    path: 'pagos',
    loadComponent: () =>
      import('./payment/list-payment/list-payment').then((m) => m.ListaPagosComponent),
  },
];
