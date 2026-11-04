import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth';

/** Pantalla de inicio de cada rol después de iniciar sesión. */
export function inicioPorRol(rol: string | null | undefined): string {
  switch (rol) {
    case 'Administrador': return '/admin';
    case 'Trabajador':    return '/portal';
    default:              return '/dashboard';
  }
}

/**
 * Pantallas de gestión del agricultor. El administrador y el trabajador
 * tienen su propia área, así que se les envía allá.
 */
export const areaAgricultorGuard: CanActivateFn = () => {
  const rol = inject(AuthService).getUsuario()?.rol;
  if (rol === 'Administrador' || rol === 'Trabajador') {
    return inject(Router).createUrlTree([inicioPorRol(rol)]);
  }
  return true;
};

/** Portal del trabajador: solo para el rol Trabajador. */
export const trabajadorGuard: CanActivateFn = () => {
  const rol = inject(AuthService).getUsuario()?.rol;
  if (rol === 'Trabajador') return true;
  return inject(Router).createUrlTree([inicioPorRol(rol)]);
};
