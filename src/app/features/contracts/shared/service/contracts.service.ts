  //Angular
  import { Injectable } from '@angular/core';
  import { HttpClient, HttpParams } from '@angular/common/http';
  import { Observable } from 'rxjs';

  //Service
  import { API_ENDPOINTS } from '../../../../core/url-constants';

  //Interface
  import { ContractTypeResponse, ContractFieldResponse, ContractDetailResponse, PurchaseOrderResponse, RemissionResponse, ContractFullResponse, AsistenciaResponse, ActaMedidaHeader, ActaMedidaDetalle, ActasDisenadorDashboard, ActasDisenadorHeader } from '../interfaces/Response.interface';
  import { InsertContractRequest, UpdateRemissionRequest, UpdateContractFullRequest, UpdateAsistenciaRequest, UpdateActaMedidaRequest } from '../interfaces/Request.interface';

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

    /** Contrato: formulario + AIU/IVA en una sola transacción en el servidor. */
    insertContractWithPlano(formData: FormData): Observable<{ mensaje: string }> {
      return this.http.post<{ mensaje: string }>(
        API_ENDPOINTS.CONTRACTS.INSERT_CONTRACT_WITH_PLANO,
        formData
      );
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

    /** Ítems de Actas de Medida (sp_insertar_actas_medida_plano). */
    insertActasMedidaDetalle(formData: FormData) {
      return this.http.post<{ mensaje: string; insertados?: number }>(
        API_ENDPOINTS.CONTRACTS.INSERT_ACTAS_MEDIDA_DETALLE,
        formData
      );
    }

    /** Genera consecutivo vía SP_GENERAR_CONSECUTIVO(tipo). Ej: ACTA_MEDIDA */
    generarConsecutivo(tipo: string) {
      return this.http.post<{
        mensaje: string;
        exitoso: number;
        consecutivo: string;
        numero: number | null;
      }>(API_ENDPOINTS.CONTRACTS.GENERAR_CONSECUTIVO, { tipo });
    }

    /** Números de contrato (SP_CONSULTAR_CONTRATOS). Reutilizable. */
    consultarContratos() {
      return this.http.get<{
        data: Array<{
          numero_contrato: string;
          label: string;
          value: string;
          [key: string]: any;
        }>;
      }>(API_ENDPOINTS.CONTRACTS.CONSULTAR_CONTRATOS);
    }

    /** Actas de Medida — SP_CONSULTAR_ACTAS_MEDIDA (cabecera + detalle). */
    consultActasMedida(params: {
      buscar?: string | null;
      constructora?: string | null;
      proyecto?: string | null;
      contrato?: string | null;
      fecha_desde?: string | null;
      fecha_hasta?: string | null;
    } = {}) {
      const httpParams = new HttpParams({
        fromObject: {
          buscar: params.buscar ?? '',
          constructora: params.constructora ?? '',
          proyecto: params.proyecto ?? '',
          contrato: params.contrato ?? '',
          fecha_desde: params.fecha_desde ?? '',
          fecha_hasta: params.fecha_hasta ?? '',
        },
      });

      return this.http.get<{
        cabecera: ActaMedidaHeader[];
        detalle: ActaMedidaDetalle[];
      }>(API_ENDPOINTS.CONTRACTS.ACTAS_MEDIDA, { params: httpParams });
    }

    /** Actualizar acta de medida (SP_ACTUALIZAR_ACTA_MEDIDA). */
    updateActaMedida(payload: UpdateActaMedidaRequest) {
      return this.http.post<{ mensaje: string; resultado?: number }>(
        `${API_ENDPOINTS.CONTRACTS.ACTAS_MEDIDA}/update`,
        payload
      );
    }

    /** Eliminar acta de medida (SP_ELIMINAR_ACTA_MEDIDA). */
    deleteActaMedida(consecutivo: string) {
      return this.http.post<{ mensaje: string; resultado?: number }>(
        `${API_ENDPOINTS.CONTRACTS.ACTAS_MEDIDA}/delete`,
        { consecutivo }
      );
    }

    /** Anular acta de medida (SP_ANULAR_ACTA_MEDIDA). */
    anularActaMedida(consecutivo: string) {
      return this.http.post<{ mensaje: string; resultado?: number }>(
        `${API_ENDPOINTS.CONTRACTS.ACTAS_MEDIDA}/anular`,
        { consecutivo }
      );
    }

    /** Actas asignadas al diseñador — SP_CONSULTAR_ACTAS_DISENADOR. */
    consultActasDisenador(params?: {
      estado?: number | null;
      id_disenador?: number | null;
    }) {
      let httpParams = new HttpParams();
      if (params?.estado != null && params.estado !== 0) {
        httpParams = httpParams.set('estado', String(params.estado));
      }
      if (params?.id_disenador != null) {
        httpParams = httpParams.set('id_disenador', String(params.id_disenador));
      }
      return this.http.get<{
        dashboard: ActasDisenadorDashboard;
        cabecera: ActasDisenadorHeader[];
        detalle: ActaMedidaDetalle[];
      }>(API_ENDPOINTS.CONTRACTS.ACTAS_DISENADOR, { params: httpParams });
    }

    /** Finalizar acta de medida (ítems + SP_FINALIZAR_ACTA_MEDIDA). */
    finalizarActaMedida(formData: FormData) {
      return this.http.post<{
        Codigo?: number;
        mensaje: string;
        resultado?: number;
      }>(`${API_ENDPOINTS.CONTRACTS.ACTAS_DISENADOR}/finalizar`, formData);
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

    consultContractsFull(params: {
      buscar?: string | null;
      estado?: string | null;
      fecha_desde?: string | null;
      fecha_hasta?: string | null;
      empresa_asociada?: string | null;
      constructora?: string | null;
      proyecto?: string | null;
    }): Observable<{ data: ContractFullResponse[] }> {
      const httpParams = new HttpParams({
        fromObject: {
          buscar: params.buscar ?? '',
          estado: params.estado ?? '',
          fecha_desde: params.fecha_desde ?? '',
          fecha_hasta: params.fecha_hasta ?? '',
          empresa_asociada: params.empresa_asociada ?? '',
          constructora: params.constructora ?? '',
          proyecto: params.proyecto ?? '',
        },
      });

      return this.http.get<{ data: ContractFullResponse[] }>(
        API_ENDPOINTS.CONTRACTS.CONSULT_CONTRACTS,
        { params: httpParams }
      );
    }

    updateContractFull(payload: UpdateContractFullRequest) {
      return this.http.post<{ mensaje: string }>(
        `${API_ENDPOINTS.CONTRACTS.CONSULT_CONTRACTS}/update`,
        payload
      );
    }

    consultAsistencia(params: {
      buscar?: string | null;
      fecha_desde?: string | null;
      fecha_hasta?: string | null;
      trabajador?: string | null;
      constructora?: string | null;
      proyecto?: string | null;
    }): Observable<{ data: AsistenciaResponse[] }> {
      const httpParams = new HttpParams({
        fromObject: {
          buscar: params.buscar ?? '',
          fecha_desde: params.fecha_desde ?? '',
          fecha_hasta: params.fecha_hasta ?? '',
          trabajador: params.trabajador ?? '',
          constructora: params.constructora ?? '',
          proyecto: params.proyecto ?? '',
        },
      });

      return this.http.get<{ data: AsistenciaResponse[] }>(
        API_ENDPOINTS.CONTRACTS.CONSULT_ASISTENCIA,
        { params: httpParams }
      );
    }

    updateAsistencia(payload: UpdateAsistenciaRequest) {
      return this.http.post<{ mensaje: string }>(
        `${API_ENDPOINTS.CONTRACTS.CONSULT_ASISTENCIA}/update`,
        payload
      );
    }
  }
