//Angular
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

//service
import { API_ENDPOINTS } from '../../../../core/url-constants';

//interface
import { UserResponse } from '../interfaces/Response.interface';
import { CreateUserData, UpdateUserData, SendStateUser } from '../interfaces/Request.interface';

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

  updateUser(payload: UpdateUserData): Observable<any> {
    return this.http.put(API_ENDPOINTS.UPDATE_USER, payload)
  }

  stateUser(payload: SendStateUser): Observable<any> {
    return this.http.post(API_ENDPOINTS.STATE_USER, payload)
  } 
}