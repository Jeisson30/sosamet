import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../../../../core/url-constants';

export interface ReportColumn {
  field: string;
  header: string;
}

export interface ReportPreviewResponse {
  code: number;
  message?: string;
  data: {
    columns: ReportColumn[];
    rows: Record<string, string | number | null>[];
    meta?: Record<string, unknown>;
  };
}

@Injectable({
  providedIn: 'root',
})
export class ReportsService {
  constructor(private http: HttpClient) {}

  previewProduccionPorContrato(
    filterParams: Record<string, string | null | undefined>
  ): Observable<ReportPreviewResponse> {
    const params = this.toHttpParams(filterParams);
    return this.http.get<ReportPreviewResponse>(
      API_ENDPOINTS.REPORTS.PRODUCTION_BY_CONTRACT_PREVIEW,
      { params }
    );
  }

  exportProduccionPorContrato(
    filterParams: Record<string, string | null | undefined>,
    format: 'xlsx' | 'pdf' = 'xlsx'
  ): Observable<Blob> {
    const params = this.toHttpParams({ ...filterParams, format });
    return this.http.get(
      API_ENDPOINTS.REPORTS.PRODUCTION_BY_CONTRACT_EXPORT,
      { params, responseType: 'blob' }
    );
  }

  previewCartera(
    filterParams: Record<string, string | null | undefined>
  ): Observable<ReportPreviewResponse> {
    const params = this.toHttpParams(filterParams);
    return this.http.get<ReportPreviewResponse>(
      API_ENDPOINTS.REPORTS.CARTERA_PREVIEW,
      { params }
    );
  }

  previewObrasActivas(
    filterParams: Record<string, string | null | undefined>
  ): Observable<ReportPreviewResponse> {
    const params = this.toHttpParams(filterParams);
    return this.http.get<ReportPreviewResponse>(
      API_ENDPOINTS.REPORTS.ACTIVE_WORKS_PREVIEW,
      { params }
    );
  }

  previewMovimientos(
    filterParams: Record<string, string | null | undefined>
  ): Observable<ReportPreviewResponse> {
    const params = this.toHttpParams(filterParams);
    return this.http.get<ReportPreviewResponse>(
      API_ENDPOINTS.REPORTS.MOVEMENTS_PREVIEW,
      { params }
    );
  }

  exportMovimientos(
    filterParams: Record<string, string | null | undefined>
  ): Observable<Blob> {
    const params = this.toHttpParams(filterParams);
    return this.http.get(API_ENDPOINTS.REPORTS.MOVEMENTS_EXPORT, {
      params,
      responseType: 'blob',
    });
  }

  previewCostosPorInsumo(
    filterParams: Record<string, string | null | undefined>
  ): Observable<ReportPreviewResponse> {
    const params = this.toHttpParams(filterParams);
    return this.http.get<ReportPreviewResponse>(
      API_ENDPOINTS.REPORTS.COSTOS_POR_INSUMO_PREVIEW,
      { params }
    );
  }

  previewSeguimientoContrato(
    filterParams: Record<string, string | null | undefined>
  ): Observable<ReportPreviewResponse> {
    const params = this.toHttpParams(filterParams);
    return this.http.get<ReportPreviewResponse>(
      API_ENDPOINTS.REPORTS.SEGUIMIENTO_CONTRATO_PREVIEW,
      { params }
    );
  }

  previewAvanceProduccionContrato(
    filterParams: Record<string, string | null | undefined>
  ): Observable<ReportPreviewResponse> {
    const params = this.toHttpParams(filterParams);
    return this.http.get<ReportPreviewResponse>(
      API_ENDPOINTS.REPORTS.AVANCE_PRODUCCION_CONTRATO_PREVIEW,
      { params }
    );
  }

  previewHistorialProyectos(
    filterParams: Record<string, string | null | undefined>
  ): Observable<ReportPreviewResponse> {
    const params = this.toHttpParams(filterParams);
    return this.http.get<ReportPreviewResponse>(
      API_ENDPOINTS.REPORTS.HISTORIAL_PROYECTOS_PREVIEW,
      { params }
    );
  }

  previewBalanceContrato(
    filterParams: Record<string, string | null | undefined>
  ): Observable<ReportPreviewResponse> {
    const params = this.toHttpParams(filterParams);
    return this.http.get<ReportPreviewResponse>(
      API_ENDPOINTS.REPORTS.BALANCE_CONTRATO_PREVIEW,
      { params }
    );
  }

  previewBalanceGlobal(
    filterParams: Record<string, string | null | undefined>
  ): Observable<ReportPreviewResponse> {
    const params = this.toHttpParams(filterParams);
    return this.http.get<ReportPreviewResponse>(
      API_ENDPOINTS.REPORTS.BALANCE_GLOBAL_PREVIEW,
      { params }
    );
  }

  exportBalanceGlobal(
    filterParams: Record<string, string | null | undefined>
  ): Observable<Blob> {
    const params = this.toHttpParams(filterParams);
    return this.http.get(API_ENDPOINTS.REPORTS.BALANCE_GLOBAL_EXPORT, {
      params,
      responseType: 'blob',
    });
  }

  saveBalanceContratoItems(body: {
    numero_contrato: string;
    adicionales?: Array<{
      concepto: string;
      valor: number | string | null;
      porcentaje?: number | string | null;
    }>;
    presupuesto?: Array<{
      concepto: string;
      valor: number | string | null;
      porcentaje?: number | string | null;
    }>;
  }): Observable<ReportPreviewResponse> {
    return this.http.put<ReportPreviewResponse>(
      API_ENDPOINTS.REPORTS.BALANCE_CONTRATO_ITEMS,
      body
    );
  }

  exportCostosPorInsumo(
    filterParams: Record<string, string | null | undefined>
  ): Observable<Blob> {
    const params = this.toHttpParams(filterParams);
    return this.http.get(API_ENDPOINTS.REPORTS.COSTOS_POR_INSUMO_EXPORT, {
      params,
      responseType: 'blob',
    });
  }

  private toHttpParams(
    obj: Record<string, string | null | undefined>
  ): HttpParams {
    let p = new HttpParams();
    for (const [k, v] of Object.entries(obj)) {
      if (v == null) continue;
      const s = String(v).trim();
      if (s === '') continue;
      p = p.set(k, s);
    }
    return p;
  }
}
