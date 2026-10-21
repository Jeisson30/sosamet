import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { puedeVerInventario } from './permissions';

/** Perfiles del Excel INVENTARIO (Admin, Aux, Supervisor, Contab, Compras, Almacenista). */
export const inventarioGuard: CanActivateFn = () => {
  const router = inject(Router);
  if (puedeVerInventario()) {
    return true;
  }
  return router.createUrlTree(['/dashboard']);
};
