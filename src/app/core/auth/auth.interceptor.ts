import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../../features/auth/shared/service/auth.service';

/**
 * Añade el header Authorization: Bearer <token> a las peticiones API.
 * No añade token a login ni a changePassword (token por link/body).
 * Ante 401 (token inválido o expirado), cierra sesión y redirige al login.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const url = req.url;

  if (auth.isPublicUrl(url)) {
    return next(req);
  }

  const token = auth.getToken();
  if (!token) {
    return next(req);
  }

  const cloned = req.clone({
    setHeaders: { Authorization: `Bearer ${token}` },
  });

  return next(cloned).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401) {
        auth.logout();
      }
      return throwError(() => err);
    })
  );
};
