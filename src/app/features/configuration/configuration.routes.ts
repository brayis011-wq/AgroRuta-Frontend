import { Routes } from '@angular/router';

export const configurationRoutes: Routes = [
  {
    path: '',
    title: 'config.title',
    loadComponent: () =>
      import('./pages/configuration-page/configuration-page').then(
        (m) => m.ConfigurationPageComponent
      ),
  },
];
