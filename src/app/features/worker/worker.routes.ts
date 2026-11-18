import { Routes } from '@angular/router';

export const workerRoutes: Routes = [
  // ── Pantalla principal: lista de trabajadores + panel detalle
  {
    path: '',
    title: 'workers.home.title',
    loadComponent: () =>
      import('./worker-home/worker-home').then((m) => m.WorkerHomeComponent),
  },

  // ── Labores (catálogo de lo que hacen los trabajadores; no confundir con las actividades de una siembra)
  {
    path: 'labors',
    title: 'workers.activities.title',
    loadComponent: () =>
      import('./labors/labor-list').then((m) => m.ListaLaboresComponent),
  },
  // Ruta anterior: se redirige para no romper enlaces guardados

  // ── Cargos
  {
    path: 'positions',
    title: 'workers.posts.title',
    loadComponent: () =>
      import('./post/list-post').then((m) => m.ListaCargosComponent),
  },

  // ── Nóminas global (ver todas, aprobar, eliminar) — SIN generar aquí
  {
    path: 'payrolls',
    title: 'workers.rosters.list.title',
    loadComponent: () =>
      import('./roster/list-roster/list-roster').then((m) => m.ListaNominasComponent),
  },
  {
    path: 'payrolls/:id',
    title: 'titles.payroll',
    loadComponent: () =>
      import('./roster/detail-roster/detail-roster').then((m) => m.DetalleNominaComponent),
  },

  // ── Jornales
  {
    path: 'workdays/new',
    title: 'workers.wages.new.title',
    loadComponent: () =>
      import('./wage/new-wage/new-wage').then((m) => m.NuevoJornalComponent),
  },
  {
    path: 'workdays',
    title: 'workers.wages.list.title',
    loadComponent: () =>
      import('./wage/list-wage/list-wage').then((m) => m.ListaJornalesComponent),
  },

  // ── Pagos
  {
    path: 'payments',
    title: 'workers.payments.title',
    loadComponent: () =>
      import('./payment/list-payment/list-payment').then((m) => m.ListaPagosComponent),
  },
];
