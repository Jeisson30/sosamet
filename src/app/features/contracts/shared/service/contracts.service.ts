//Angular
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

//Service
import { API_ENDPOINTS } from '../../../../core/url-constants';

//Interface
import { ContractTypeResponse, ContractFieldResponse, ContractDetailResponse } from '../interfaces/Response.interface';
import { InsertContractRequest } from '../interfaces/Request.interface';

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

  insertContract(data: InsertContractRequest): Observable<any> {
    return this.http.post(`${API_ENDPOINTS.CONTRACTS.INSERT_CONTRACT}`, data);
  }
  
  getContractDetail(tipo: string, numero: string): Observable<{ data: ContractDetailResponse }> {
    return this.http.get<{ data: ContractDetailResponse }>(
      `${API_ENDPOINTS.CONTRACTS.GET_DETAIL}/${tipo}/${numero}`
    );
  }

  uploadExcelAIU(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ mensaje: string }>(
      API_ENDPOINTS.CONTRACTS.UPLOAD_FILE_AIU,
      formData
    );
  }
  
  uploadExcelIVA(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ mensaje: string }>(
      API_ENDPOINTS.CONTRACTS.UPLOAD_FILE_IVA,
      formData
    );
  }

  uploadExcelOrder(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ mensaje: string }>(
      API_ENDPOINTS.CONTRACTS.UPLOAD_FILE_OC,
      formData
    );
  }

  uploadExcelRemision(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ mensaje: string }>(
      API_ENDPOINTS.CONTRACTS.UPLOAD_FILE_REMISION,
      formData
    );
  }

  uploadExcelActaPago(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ mensaje: string }>(
      API_ENDPOINTS.CONTRACTS.UPLOAD_FILE_ACTA_PAGO,
      formData
    );
  }
  
  
}
