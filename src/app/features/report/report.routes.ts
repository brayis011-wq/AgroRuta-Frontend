import { Routes } from '@angular/router';

export const REPORT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./report-home/report-home').then(m => m.ReportHomeComponent)
  }
];
