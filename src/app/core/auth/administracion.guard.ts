import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { puedeVerAdministracion } from './permissions';

/** Admin, Supervisor de Proyectos y Auxiliar (paridad operativa). */
export const administracionGuard: CanActivateFn = () => {
  const router = inject(Router);
  if (puedeVerAdministracion()) {
    return true;
  }
  return router.createUrlTree(['/dashboard']);
};
