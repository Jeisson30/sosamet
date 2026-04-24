import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

/**
 * Restringe rutas al perfil administrador (id_perfil === 1 en localStorage).
 */
export const adminGuard: CanActivateFn = () => {
  const router = inject(Router);
  if (Number(localStorage.getItem('id_perfil')) === 1) {
    return true;
  }
  return router.createUrlTree(['/dashboard']);
};
