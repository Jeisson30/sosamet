import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../../core/url-constants';

export interface ConstructoraDto {
  id: string;
  nombre: string;
  nit: string;
  estado: string;
}

export interface ProyectoDto {
  id: string;
  nombre: string;
  idConstructora: string;
  estado: string;
}

@Injectable({
  providedIn: 'root',
})
export class CatalogService {
  constructor(private http: HttpClient) {}

  getConstructoras(): Observable<ConstructoraDto[]> {
    return this.http.get<ConstructoraDto[]>(API_ENDPOINTS.CATALOG.CONSTRUCTORAS);
  }

  getProyectosByConstructora(idConstructora: string): Observable<ProyectoDto[]> {
    return this.http.get<ProyectoDto[]>(
      API_ENDPOINTS.CATALOG.PROYECTOS_BY_CONSTRUCTORA(idConstructora)
    );
  }
}

