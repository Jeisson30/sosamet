import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../../../../core/url-constants';
import {
  ConstructoraAdmin,
  ProyectoAdmin,
  SpAdminResponse,
} from '../interfaces/administracion.interface';

@Injectable({
  providedIn: 'root',
})
export class AdministracionService {
  constructor(private http: HttpClient) {}

  listarConstructoras(
    estado: 'ACTIVO' | 'INACTIVO' = 'ACTIVO'
  ): Observable<SpAdminResponse<ConstructoraAdmin[]>> {
    const params = new HttpParams().set('estado', estado);
    return this.http.get<SpAdminResponse<ConstructoraAdmin[]>>(
      API_ENDPOINTS.ADMINISTRACION.CONSTRUCTORAS,
      { params }
    );
  }

  crearConstructora(payload: {
    nombre: string;
    nit: string;
  }): Observable<SpAdminResponse> {
    return this.http.post<SpAdminResponse>(
      API_ENDPOINTS.ADMINISTRACION.CONSTRUCTORAS,
      payload
    );
  }

  cambiarEstadoConstructora(
    idConstructora: number,
    estado: 'ACTIVO' | 'INACTIVO'
  ): Observable<SpAdminResponse> {
    return this.http.patch<SpAdminResponse>(
      API_ENDPOINTS.ADMINISTRACION.CONSTRUCTORA_ESTADO(idConstructora),
      { estado }
    );
  }

  listarProyectos(
    idConstructora: number,
    estado: 'ACTIVO' | 'INACTIVO' = 'ACTIVO'
  ): Observable<SpAdminResponse<ProyectoAdmin[]>> {
    const params = new HttpParams().set('estado', estado);
    return this.http.get<SpAdminResponse<ProyectoAdmin[]>>(
      API_ENDPOINTS.ADMINISTRACION.PROYECTOS_BY_CONSTRUCTORA(idConstructora),
      { params }
    );
  }

  crearProyecto(payload: {
    id_constructora: number;
    nombre: string;
  }): Observable<SpAdminResponse> {
    return this.http.post<SpAdminResponse>(
      API_ENDPOINTS.ADMINISTRACION.PROYECTOS,
      payload
    );
  }

  cambiarEstadoProyecto(
    idProyecto: number,
    estado: 'ACTIVO' | 'INACTIVO'
  ): Observable<SpAdminResponse> {
    return this.http.patch<SpAdminResponse>(
      API_ENDPOINTS.ADMINISTRACION.PROYECTO_ESTADO(idProyecto),
      { estado }
    );
  }
}
