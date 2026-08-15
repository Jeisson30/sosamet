//Angular
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

//Service
import { API_ENDPOINTS } from '../../../../core/url-constants';


//Interface
import { Company, GestionUser, ApiResponse, LiquidationPayload, OrderWorkPayload, OtActasPlanosDisponiblesResponse, CrearOrdenTrabajoAsignadaPayload, CrearOrdenTrabajoAsignadaResponse } from '../interfaces/Response.interface';

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

    createLiquidation(data: LiquidationPayload): Observable<any> {
      return this.http.post(
        API_ENDPOINTS.GESTION.CREATE_LIQUIDATION,
        data
      );
    }

    createOrderWork(data: OrderWorkPayload): Observable<any> {
      return this.http.post(
        API_ENDPOINTS.GESTION.CREATE_ORDER_WORK,
        data
      );
    }

    getActasPlanosDisponiblesOt(): Observable<OtActasPlanosDisponiblesResponse> {
      return this.http.get<OtActasPlanosDisponiblesResponse>(
        API_ENDPOINTS.GESTION.ACTAS_PLANOS_DISPONIBLES_OT
      );
    }

    crearOrdenTrabajoAsignada(
      data: CrearOrdenTrabajoAsignadaPayload
    ): Observable<CrearOrdenTrabajoAsignadaResponse> {
      return this.http.post<CrearOrdenTrabajoAsignadaResponse>(
        API_ENDPOINTS.GESTION.CREATE_ORDER_WORK_ASIGNADA,
        data
      );
    }
}
