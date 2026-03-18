  //Angular
  import { Injectable } from '@angular/core';
  import { HttpClient, HttpParams } from '@angular/common/http';
  import { Observable } from 'rxjs';

  //Service
  import { API_ENDPOINTS } from '../../../../core/url-constants';

  //Interface
  import { ContractTypeResponse, ContractFieldResponse, ContractDetailResponse, PurchaseOrderResponse, RemissionResponse } from '../interfaces/Response.interface';
  import { InsertContractRequest, UpdateRemissionRequest } from '../interfaces/Request.interface';

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

    /** Archivo + consecutivo y tipo_doc (solo Orden de Compra). El back exige consecutivo en el body. */
    uploadExcelOrder(file: File, consecutivo: string, tipoDoc: string = 'ORDEN DE COMPRA') {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('consecutivo', consecutivo);
      formData.append('tipo_doc', tipoDoc);
      return this.http.post<{ mensaje: string }>(
        API_ENDPOINTS.CONTRACTS.UPLOAD_FILE_OC,
        formData
      );
    }

    uploadExcelRemision(formData: FormData) {
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
    
    getCompanies(): Observable<any[]> {
      return this.http.get<any[]>(API_ENDPOINTS.CONTRACTS.GET_COMPANIES);
    }

    consultPurchaseOrders(params: {
      buscar?: string | null;
      fecha_desde?: string | null;
      fecha_hasta?: string | null;
      estado?: string | null;
      proyecto?: string | null;
    }): Observable<{ data: PurchaseOrderResponse[] }> {
      const httpParams = new HttpParams({
        fromObject: {
          buscar: params.buscar ?? '',
          fecha_desde: params.fecha_desde ?? '',
          fecha_hasta: params.fecha_hasta ?? '',
          estado: params.estado ?? '',
          proyecto: params.proyecto ?? '',
        },
      });

      return this.http.get<{ data: PurchaseOrderResponse[] }>(
        API_ENDPOINTS.CONTRACTS.PURCHASE_ORDERS,
        { params: httpParams }
      );
    }

    consultRemissions(params: {
      buscar?: string | null;
      fecha_desde?: string | null;
      fecha_hasta?: string | null;
      empresa_asociada?: string | null;
      constructora?: string | null;
      proyecto?: string | null;
    }): Observable<{ data: RemissionResponse[] }> {
      const httpParams = new HttpParams({
        fromObject: {
          buscar: params.buscar ?? '',
          fecha_desde: params.fecha_desde ?? '',
          fecha_hasta: params.fecha_hasta ?? '',
          empresa_asociada: params.empresa_asociada ?? '',
          constructora: params.constructora ?? '',
          proyecto: params.proyecto ?? '',
        },
      });

      return this.http.get<{ data: RemissionResponse[] }>(
        API_ENDPOINTS.CONTRACTS.REMISSIONS,
        { params: httpParams }
      );
    }

    updateRemission(payload: UpdateRemissionRequest) {
      return this.http.post<{ mensaje: string }>(
        `${API_ENDPOINTS.CONTRACTS.REMISSIONS}/update`,
        payload
      );
    }
  }
