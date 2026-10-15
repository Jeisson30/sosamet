import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { API_ENDPOINTS } from '../../../../core/url-constants';
import {
  OtroSiAccionResponse,
  OtroSiConsultaRow,
  OtroSiContextoResponse,
  OtroSiContrato,
  OtroSiDetalleResponse,
  OtroSiPayload,
  OtroSiRegistroResponse,
} from '../otro-si.model';

const toParams = (filtros: Record<string, string | null | undefined>): HttpParams => {
  let params = new HttpParams();
  for (const [k, v] of Object.entries(filtros)) {
    const s = v == null ? '' : String(v).trim();
    if (s) params = params.set(k, s);
  }
  return params;
};

@Injectable({ providedIn: 'root' })
export class OtroSiService {
  constructor(private http: HttpClient) {}

  /** Contratos activos (buscador del Otro Sí). */
  listarContratos(filtros: {
    constructora?: string | null;
    proyecto?: string | null;
    tipo_doc?: string | null;
    numerodoc?: string | null;
  } = {}): Observable<OtroSiContrato[]> {
    return this.http
      .get<{ contratos: OtroSiContrato[] }>(API_ENDPOINTS.CONTRACTS.OTRO_SI_CONTRATOS, {
        params: toParams(filtros),
      })
      .pipe(map((r) => r.contratos || []));
  }

  /** Con idOtroSi (edición) el contrato viene como estaba antes de ese Otro Sí. */
  contextoContrato(numerodoc: string, idOtroSi?: number | null): Observable<OtroSiContextoResponse> {
    return this.http.get<OtroSiContextoResponse>(API_ENDPOINTS.CONTRACTS.OTRO_SI_CONTRATO(numerodoc), {
      params: toParams({ otrosi: idOtroSi ? String(idOtroSi) : null }),
    });
  }

  registrar(payload: OtroSiPayload): Observable<OtroSiRegistroResponse> {
    return this.http.post<OtroSiRegistroResponse>(API_ENDPOINTS.CONTRACTS.OTRO_SI, payload);
  }

  editar(id: number, payload: OtroSiPayload): Observable<OtroSiRegistroResponse> {
    return this.http.put<OtroSiRegistroResponse>(API_ENDPOINTS.CONTRACTS.OTRO_SI_BY_ID(id), payload);
  }

  anular(id: number, motivo: string): Observable<OtroSiAccionResponse> {
    return this.http.post<OtroSiAccionResponse>(API_ENDPOINTS.CONTRACTS.OTRO_SI_ANULAR(id), { motivo });
  }

  eliminar(id: number): Observable<OtroSiAccionResponse> {
    return this.http.delete<OtroSiAccionResponse>(API_ENDPOINTS.CONTRACTS.OTRO_SI_BY_ID(id));
  }

  listar(filtros: {
    buscar?: string | null;
    constructora?: string | null;
    proyecto?: string | null;
    tipo?: string | null;
    estado?: string | null;
    fecha_desde?: string | null;
    fecha_hasta?: string | null;
  } = {}): Observable<OtroSiConsultaRow[]> {
    return this.http
      .get<{ otrosi: OtroSiConsultaRow[] }>(API_ENDPOINTS.CONTRACTS.OTRO_SI, { params: toParams(filtros) })
      .pipe(map((r) => r.otrosi || []));
  }

  detalle(id: number): Observable<OtroSiDetalleResponse> {
    return this.http.get<OtroSiDetalleResponse>(API_ENDPOINTS.CONTRACTS.OTRO_SI_BY_ID(id));
  }
}
