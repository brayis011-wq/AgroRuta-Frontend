import { Routes } from '@angular/router';

/** Dinero de la finca: ventas y lo que te deben, gastos generales y precios de referencia */
export const financeRoutes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'sales' },
  {
    path: 'sales',
    title: 'ventas.title',
    loadComponent: () => import('./sales/sales').then((m) => m.VentasComponent),
  },
  {
    path: 'expenses',
    title: 'gastos.title',
    loadComponent: () => import('./expenses/expenses').then((m) => m.GastosComponent),
  },
  {
    path: 'prices',
    title: 'precios.title',
    loadComponent: () => import('./prices/prices').then((m) => m.PreciosComponent),
  },
];
