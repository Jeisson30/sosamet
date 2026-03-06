// Angular
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';

// Service
import { API_ENDPOINTS } from '../../../../core/url-constants';

// Interface
import { SendChangePass, SendLogin } from '../interfaces/Request.interface';

const TOKEN_KEY = 'token';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  hasToken(): boolean {
    return !!this.getToken();
  }

  /**
   * URLs que no deben llevar header Authorization (login y cambio de contraseña por link).
   */
  isPublicUrl(url: string): boolean {
    return url.includes('auth/loginUser') || url.includes('auth/changePassword');
  }

  changePassword(payload: SendChangePass): Observable<any> {
    return this.http.post(API_ENDPOINTS.AUTH.CHANGE_PASS, payload);
  }

  loginUser(payload: SendLogin): Observable<any> {
    return this.http.post(API_ENDPOINTS.AUTH.LOGIN_USER, payload);
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('nombreUsuario');
    localStorage.removeItem('id_usuario');
    localStorage.removeItem('id_perfil');
    localStorage.removeItem('nombre_perfil');
    localStorage.removeItem('apellidoUsuario');
    this.router.navigate(['']);
  }
}