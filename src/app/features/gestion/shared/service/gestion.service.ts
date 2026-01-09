//Angular
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

//Service
import { API_ENDPOINTS } from '../../../../core/url-constants';


//Interface
import { Company, GestionUser, ApiResponse } from '../interfaces/Response.interface';

@Injectable({
  providedIn: 'root',
})
export class GestionService {

  constructor(private http: HttpClient) {}

    getAllUsers(): Observable<ApiResponse<GestionUser[]>> {
    return this.http.get<ApiResponse<GestionUser[]>>(API_ENDPOINTS.GESTION.GET_ALL_USERS);
    } 

    getCompanies(): Observable<Company[]> {
        return this.http.get<Company[]>(API_ENDPOINTS.CONTRACTS.GET_COMPANIES);
    }
}
