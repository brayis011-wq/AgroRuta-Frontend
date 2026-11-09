import { Routes } from '@angular/router';

export const workerRoutes: Routes = [
  // ── Pantalla principal: lista de trabajadores + panel detalle
  {
    path: '',
    loadComponent: () =>
      import('./worker-home/worker-home').then((m) => m.WorkerHomeComponent),
  },

  // ── Labores (catálogo de lo que hacen los trabajadores; no confundir con las actividades de una siembra)
  {
    path: 'labors',
    loadComponent: () =>
      import('./labors/labor-list').then((m) => m.ListaLaboresComponent),
  },
  // Ruta anterior: se redirige para no romper enlaces guardados

  // ── Cargos
  {
    path: 'positions',
    loadComponent: () =>
      import('./post/list-post').then((m) => m.ListaCargosComponent),
  },

  // ── Nóminas global (ver todas, aprobar, eliminar) — SIN generar aquí
  {
    path: 'payrolls',
    loadComponent: () =>
      import('./roster/list-roster/list-roster').then((m) => m.ListaNominasComponent),
  },
  {
    path: 'payrolls/:id',
    loadComponent: () =>
      import('./roster/detail-roster/detail-roster').then((m) => m.DetalleNominaComponent),
  },

  // ── Jornales
  {
    path: 'workdays/new',
    loadComponent: () =>
      import('./wage/new-wage/new-wage').then((m) => m.NuevoJornalComponent),
  },
  {
    path: 'workdays',
    loadComponent: () =>
      import('./wage/list-wage/list-wage').then((m) => m.ListaJornalesComponent),
  },

  // ── Pagos
  {
    path: 'payments',
    loadComponent: () =>
      import('./payment/list-payment/list-payment').then((m) => m.ListaPagosComponent),
  },
];
