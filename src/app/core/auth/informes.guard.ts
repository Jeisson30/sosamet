import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

/** Administrador (1) y Contabilidad (10). */
const PERFILES_INFORMES = [1, 10];

export const informesGuard: CanActivateFn = () => {
  const router = inject(Router);
  const id = Number(localStorage.getItem('id_perfil'));
  if (PERFILES_INFORMES.includes(id)) {
    return true;
  }
  return router.createUrlTree(['/dashboard']);
};
