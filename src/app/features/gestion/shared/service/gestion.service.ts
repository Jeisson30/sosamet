//Angular
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

//Service
import { API_ENDPOINTS } from '../../../../core/url-constants';


//Interface
import { Company, GestionUser, ApiResponse, LiquidationPayload, OrderWorkPayload, OtActasPlanosDisponiblesResponse, CrearOrdenTrabajoAsignadaPayload, CrearOrdenTrabajoAsignadaResponse, ConsultOrdenesTrabajoResponse, UpdateOrdenTrabajoRequest, MantOrdenTrabajoResponse } from '../interfaces/Response.interface';

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

    consultOrdenesTrabajo(params: {
      buscar?: string | null;
      encargado_id?: number | null;
      fecha_desde?: string | null;
      fecha_hasta?: string | null;
      constructora?: string | null;
      proyecto?: string | null;
      contrato?: string | null;
    } = {}): Observable<ConsultOrdenesTrabajoResponse> {
      const httpParams = new HttpParams({
        fromObject: {
          buscar: params.buscar ?? '',
          encargado_id:
            params.encargado_id != null ? String(params.encargado_id) : '',
          fecha_desde: params.fecha_desde ?? '',
          fecha_hasta: params.fecha_hasta ?? '',
          constructora: params.constructora ?? '',
          proyecto: params.proyecto ?? '',
          contrato: params.contrato ?? '',
        },
      });

      return this.http.get<ConsultOrdenesTrabajoResponse>(
        API_ENDPOINTS.GESTION.CONSULT_ORDER_WORK,
        { params: httpParams }
      );
    }

    updateOrdenTrabajo(
      data: UpdateOrdenTrabajoRequest
    ): Observable<MantOrdenTrabajoResponse> {
      return this.http.post<MantOrdenTrabajoResponse>(
        API_ENDPOINTS.GESTION.UPDATE_ORDER_WORK,
        data
      );
    }

    anularOrdenTrabajo(id_order_work: number): Observable<MantOrdenTrabajoResponse> {
      return this.http.post<MantOrdenTrabajoResponse>(
        API_ENDPOINTS.GESTION.ANULAR_ORDER_WORK,
        { id_order_work }
      );
    }

    deleteOrdenTrabajo(id_order_work: number): Observable<MantOrdenTrabajoResponse> {
      return this.http.post<MantOrdenTrabajoResponse>(
        API_ENDPOINTS.GESTION.DELETE_ORDER_WORK,
        { id_order_work }
      );
    }
}
