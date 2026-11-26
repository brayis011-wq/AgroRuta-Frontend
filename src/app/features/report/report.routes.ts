import { Routes } from '@angular/router';

export const REPORT_ROUTES: Routes = [
  {
    path: '',
    title: 'layout.nav.reports',
    loadComponent: () => import('./report-home/report-home').then((m) => m.ReportHomeComponent),
  },
];
