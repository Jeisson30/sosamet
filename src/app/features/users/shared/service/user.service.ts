//Angular
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

//service
import { API_ENDPOINTS } from '../../../../core/url-constants';

//interface
import { UserResponse } from '../interfaces/Response.interface';
import {
  CreateUserData,
  UpdateUserData,
  SendStateUser,
  DeleteUserData,
} from '../interfaces/Request.interface';

@Injectable({
    providedIn: 'root',
  })

export class UserService {
  constructor(private http: HttpClient) {}

  getRoles(): Observable<any>{
    return this.http.get<any>(API_ENDPOINTS.ROLES)
  }

  getDataUsers(): Observable<UserResponse[]> {
    return this.http.get<UserResponse[]>(API_ENDPOINTS.USERS);
  }

  createUsers(payload : CreateUserData): Observable<any> {
    return this.http.post(API_ENDPOINTS.CREATE_USERS, payload)
  }

  /** System users (FULL) or catalog (DIRECTORY). */
  getDataUsersByMode(accountMode: 'FULL' | 'DIRECTORY'): Observable<UserResponse[]> {
    return this.http.get<UserResponse[]>(API_ENDPOINTS.USERS, {
      params: { account_mode: accountMode },
    });
  }

  createCatalogUser(payload: {
    p_nombre: string;
    p_apellido: string;
    p_identificacion: string;
    p_idperfil: string | number;
    p_idrol?: string | number;
  }): Observable<any> {
    return this.http.post(API_ENDPOINTS.CATALOG_USERS, payload);
  }

  enableCatalogAccess(payload: {
    p_id_usuario: number | string;
    p_email: string;
  }): Observable<any> {
    return this.http.post(API_ENDPOINTS.CATALOG_USERS_ENABLE_ACCESS, payload);
  }

  updateUser(payload: UpdateUserData): Observable<any> {
    return this.http.put(API_ENDPOINTS.UPDATE_USER, payload)
  }

  stateUser(payload: SendStateUser): Observable<any> {
    return this.http.post(API_ENDPOINTS.STATE_USER, payload)
  }

  deleteUser(payload: DeleteUserData): Observable<any> {
    return this.http.post(API_ENDPOINTS.DELETE_USER, payload);
  }
}