import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth';

/**
 * El administrador tiene su propio panel en /admin.
 * Si intenta entrar a las pantallas del agricultor, se le envía allá.
 */
export const redirectAdminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.getUsuario()?.rol === 'Administrador') {
    return router.createUrlTree(['/admin']);
  }
  return true;
};
