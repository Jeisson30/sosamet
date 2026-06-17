import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

/** Administrador (1) y Supervisor de proyectos (2). */
const PERFILES_ADMINISTRACION = [1, 2];

export const administracionGuard: CanActivateFn = () => {
  const router = inject(Router);
  const id = Number(localStorage.getItem('id_perfil'));
  if (PERFILES_ADMINISTRACION.includes(id)) {
    return true;
  }
  return router.createUrlTree(['/dashboard']);
};
