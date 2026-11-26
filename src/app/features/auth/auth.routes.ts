import { Routes } from '@angular/router';

export const authRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./auth-shell/auth-shell').then((m) => m.AuthShell),
    children: [
      { path: '', redirectTo: 'login', pathMatch: 'full' },
      {
        path: 'login',
        title: 'auth.login.title',
        loadComponent: () => import('./login/login').then((m) => m.LoginComponent),
      },
      {
        path: 'register',
        title: 'auth.register.title',
        loadComponent: () => import('./register/register').then((m) => m.RegistroComponent),
      },
      {
        path: 'forgot-password',
        title: 'auth.forgot.title',
        loadComponent: () =>
          import('./forgot-password/forgot-password').then((m) => m.RecuperarComponent),
      },
      {
        path: 'verify',
        title: 'titles.verify',
        loadComponent: () => import('./verify/verify').then((m) => m.VerificarComponent),
      },
      {
        path: 'reset-password',
        title: 'auth.reset.title',
        loadComponent: () =>
          import('./reset-password/reset-password').then((m) => m.RestablecerComponent),
      },
    ],
  },
];
