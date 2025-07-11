//Angular
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

//Service
import { API_ENDPOINTS } from '../../../../core/url-constants';

//Interface
import { ContractTypeResponse, ContractFieldResponse } from '../interfaces/Response.interface';

@Injectable({
  providedIn: 'root',
})
export class ContractsService {
  constructor(private http: HttpClient) {}

  getTypeContract(): Observable<ContractTypeResponse[]> {
    return this.http.get<ContractTypeResponse[]>(API_ENDPOINTS.CONTRACTS.GET_TYPE_DOC);
  }

  getTypeFields(type: string): Observable<ContractFieldResponse[]> {
    return this.http.get<ContractFieldResponse[]>(`${API_ENDPOINTS.CONTRACTS.GET_TYPE_FIELDS}/${type}`);
  }
  
}
