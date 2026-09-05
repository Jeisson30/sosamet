import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../../../../core/url-constants';
import {
  ConstructoraAdmin,
  ProyectoAdmin,
  SpAdminResponse,
  DocumentoNumeroAdmin,
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

  listarCotizacionesPendientes(tipoDoc: string): Observable<{
    Codigo: number;
    Mensaje: string;
    data: Array<{
      value: string;
      label: string;
      origen?: string[];
      cantidad?: number;
    }>;
  }> {
    const params = new HttpParams().set('tipo_doc', tipoDoc);
    return this.http.get<{
      Codigo: number;
      Mensaje: string;
      data: Array<{
        value: string;
        label: string;
        origen?: string[];
        cantidad?: number;
      }>;
    }>(API_ENDPOINTS.ADMINISTRACION.COTIZACIONES_PENDIENTES, { params });
  }

  amarrarContrato(payload: {
    numero_contrato: string;
    tipo_doc: string;
    numero_cotizacion: string;
  }): Observable<{
    Codigo: number;
    Mensaje: string;
    resumen?: Record<string, number>;
    total?: number;
  }> {
    return this.http.post<{
      Codigo: number;
      Mensaje: string;
      resumen?: Record<string, number>;
      total?: number;
    }>(API_ENDPOINTS.ADMINISTRACION.AMARRAR_CONTRATO, payload);
  }

  listarDocumentosNumero(filters: {
    id_constructora?: number | null;
    id_proyecto?: number | null;
    tipo_doc?: string | null;
    estado?: string;
  } = {}): Observable<{
    Codigo: number;
    Mensaje: string;
    data: DocumentoNumeroAdmin[];
  }> {
    let params = new HttpParams();
    if (filters.id_constructora) {
      params = params.set('id_constructora', String(filters.id_constructora));
    }
    if (filters.id_proyecto) {
      params = params.set('id_proyecto', String(filters.id_proyecto));
    }
    if (filters.tipo_doc) {
      params = params.set('tipo_doc', filters.tipo_doc);
    }
    if (filters.estado) {
      params = params.set('estado', filters.estado);
    }
    return this.http.get<{
      Codigo: number;
      Mensaje: string;
      data: DocumentoNumeroAdmin[];
    }>(API_ENDPOINTS.ADMINISTRACION.DOCUMENTOS_NUMERO, { params });
  }

  crearDocumentoNumero(payload: {
    id_constructora: number;
    id_proyecto: number;
    tipo_doc: string;
    numero_documento: string;
  }): Observable<{
    Codigo: number;
    Mensaje: string;
    data?: DocumentoNumeroAdmin;
  }> {
    return this.http.post<{
      Codigo: number;
      Mensaje: string;
      data?: DocumentoNumeroAdmin;
    }>(API_ENDPOINTS.ADMINISTRACION.DOCUMENTOS_NUMERO, payload);
  }

  cambiarEstadoDocumentoNumero(
    idDocumentoNumero: number,
    estado: 'ACTIVO' | 'INACTIVO'
  ): Observable<{
    Codigo: number;
    Mensaje: string;
    data?: DocumentoNumeroAdmin;
  }> {
    return this.http.patch<{
      Codigo: number;
      Mensaje: string;
      data?: DocumentoNumeroAdmin;
    }>(API_ENDPOINTS.ADMINISTRACION.DOCUMENTO_NUMERO_ESTADO(idDocumentoNumero), {
      estado,
    });
  }

  actualizarDocumentoNumero(
    idDocumentoNumero: number,
    payload: {
      id_constructora: number;
      id_proyecto: number;
      tipo_doc: string;
      numero_documento: string;
      estado?: 'ACTIVO' | 'INACTIVO';
    }
  ): Observable<{
    Codigo: number;
    Mensaje: string;
    data?: DocumentoNumeroAdmin;
  }> {
    return this.http.put<{
      Codigo: number;
      Mensaje: string;
      data?: DocumentoNumeroAdmin;
    }>(
      API_ENDPOINTS.ADMINISTRACION.DOCUMENTO_NUMERO_BY_ID(idDocumentoNumero),
      payload
    );
  }

  eliminarDocumentoNumero(idDocumentoNumero: number): Observable<{
    Codigo: number;
    Mensaje: string;
  }> {
    return this.http.delete<{
      Codigo: number;
      Mensaje: string;
    }>(API_ENDPOINTS.ADMINISTRACION.DOCUMENTO_NUMERO_BY_ID(idDocumentoNumero));
  }
}
