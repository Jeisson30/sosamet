import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from '../../features/auth/shared/service/auth.service';

/**
 * Protege rutas que requieren sesión. Si no hay token, redirige al login.
 */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.hasToken()) {
    return true;
  }
  return router.createUrlTree(['']);
};
