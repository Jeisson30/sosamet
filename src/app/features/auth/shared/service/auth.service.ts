//Angular
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

//Service
import { API_ENDPOINTS } from '../../../../core/url-constants';

//Interface
import { SendChangePass, SendLogin } from '../interfaces/Request.interface';

@Injectable({
    providedIn: 'root',
  })

export class AuthService {
    constructor(private http : HttpClient){}

    changePassword(payload : SendChangePass):Observable<any>{
      return this.http.post(API_ENDPOINTS.AUTH.CHANGE_PASS, payload)
    }

    loginUser(payload : SendLogin): Observable<any> {
      return this.http.post(API_ENDPOINTS.AUTH.LOGIN_USER, payload)
    }
}