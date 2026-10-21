import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { puedeVerInformes } from './permissions';

/** Admin, Supervisor de Proyectos o Contabilidad (Excel INFORMES). */
export const informesGuard: CanActivateFn = () => {
  const router = inject(Router);
  if (puedeVerInformes()) {
    return true;
  }
  return router.createUrlTree(['/dashboard']);
};
