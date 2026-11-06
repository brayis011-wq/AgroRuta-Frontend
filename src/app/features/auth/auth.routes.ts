import { Routes } from '@angular/router';

export const authRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./auth-shell/auth-shell').then((m) => m.AuthShell),
    children: [
      { path: '', redirectTo: 'login', pathMatch: 'full' },
      {
        path: 'login',
        loadComponent: () => import('./login/login').then((m) => m.LoginComponent),
      },
      {
        path: 'registro',
        loadComponent: () => import('./registro/registro').then((m) => m.RegistroComponent),
      },
      {
        path: 'recuperar',
        loadComponent: () => import('./recuperar/recuperar').then((m) => m.RecuperarComponent),
      },
      {
        path: 'verificar',
        loadComponent: () => import('./verificar/verificar').then((m) => m.VerificarComponent),
      },
      {
        path: 'restablecer',
        loadComponent: () => import('./restablecer/restablecer').then((m) => m.RestablecerComponent),
      },
    ],
  },
];
