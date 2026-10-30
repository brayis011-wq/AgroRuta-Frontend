import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth';

export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.getUsuario()?.rol === 'Administrador') {
    return true;
  }

  router.navigate(['/dashboard']);
  return false;
};
