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
