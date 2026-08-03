export interface ContractTypeResponse {
  tipo_doc: string;
}

export interface ContractFieldResponse {
  nombre_campo_doc: string;
  desc_campo_doc: string;
  estadocampo: string;
  tipo_dato: 'text' | 'number' | 'date' | 'file';
}

export interface ContractDetailResponse {
  [key: string]: string;
}

export interface PurchaseOrderResponse {
  id: number;
  contrato: string | null;
  item: string | null;
  elemento: string | null;
  descripcion: string | null;
  ubicacion: string | null;
  um: string | null;
  base: number | null;
  altura: number | null;
  total: number | null;
  otros: number | null;
  cantidad: number | null;
  proveedor: string | null;
  tipo_doc: string;
  numdoc: string;
  fecha_creacion: string;
  constructora: string | null;
  estado: string | null;
  proyecto: string | null;
  numero_contrato: string | null;
  numero_plano: string | null;
  observaciones: string | null;
  fecha_terminacion: string | null;
  foto_1_orden: string | null;
}

/** Fila de SP_ConsultarContratosFull (cabecera + detalle por ítem). */
export interface ContractFullResponse {
  numerodoc: string | null;
  tipo_doc_contratista: string | null;
  numero_contrato: string | null;
  empresa_asociada: string | null;
  empresa: string | null;
  nit_empresa: string | null;
  proyecto: string | null;
  ciudad_empresa: string | null;
  tipo_contrato: string | null;
  estado: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  descripcion: string | null;
  porcentaje_anticipo: string | null;
  valor_anticipo: string | null;
  estado_pago_anticipo: string | null;
  rete_garantia: string | null;
  valor_r_garantia: string | null;
  estado_pago_r_garantia: string | null;
  polizas: string | null;
  valor_polizas_in: string | null;
  estado_polizas_in: string | null;
  polizas_finales: string | null;
  valor_polizas_fin: string | null;
  estado_polizas_fin: string | null;
  valor_contrato: string | null;
  id: number | null;
  item: string | null;
  empresa_detalle: string | null;
  ref: string | null;
  cant: string | null;
  und: string | null;
  ancho: string | null;
  alto: string | null;
  descripcion_detalle: string | null;
  insumo: string | null;
  valor_base: string | null;
  porc_adm: string | null;
  vr_adm: string | null;
  porc_imp: string | null;
  vr_imp: string | null;
  porc_ut: string | null;
  vr_ut: string | null;
  porc_iva: string | null;
  vr_iva: string | null;
  vr_total: string | null;
  tipo_detalle: string | null;
}

/** Fila de SP_ConsultarAsistencia (un registro por documento). */
export interface AsistenciaResponse {
  numerodoc: string | null;
  consecutivo: string | null;
  constructora: string | null;
  proyecto: string | null;
  ubicacion: string | null;
  detalle_visita: string | null;
  foto1: string | null;
  foto2: string | null;
  fecha: string | null;
  trabajador: string | null;
}

export interface ActaMedidaHeader {
  consecutivo: string;
  constructora: string | null;
  proyecto: string | null;
  numero_contrato: string | null;
  fecha_acta: string | null;
  fecha_terminacion: string | null;
  observaciones: string | null;
  tipo_documento: string | null;
  descripcion_general: string | null;
  id_disenador: string | number | null;
  disenador_encargado: string | null;
  /** 3 = anulada */
  estado?: string | number | null;
  /** Derivado en front desde detalle o fecha_acta */
  fecha_creacion?: string | null;
  tiempo_transcurrido?: number | null;
}

export interface ActaMedidaDetalle {
  amd_id: number | string;
  amd_consecutivo: string;
  amd_numero_contrato: string | null;
  amd_item: string | null;
  amd_detalle: string | null;
  amd_cantidad: number | string | null;
  amd_unidad_medida: string | null;
  amd_ancho: number | string | null;
  amd_alto: number | string | null;
  amd_observaciones: string | null;
  amd_evidencia: string | null;
  amd_estado: string | number | null;
  amd_fecha_creacion: string | null;
  amd_usuario_creacion: string | number | null;
  usuario_creacion: string | null;
  amd_fecha_modificacion: string | null;
  amd_usuario_modificacion: string | number | null;
}

export interface RemissionResponse {
  id: number;
  numerodoc?: string | null;
  contrato: string | null;
  empresa: string | null;
  item: string | null;
  cantidad: number | null;
  um: string | null;
  detalle: string | null;
  observaciones: string | null;
  tipo_doc: string;
  fecha_creacion: string;

  tipo_doc_rem: string | null;
  numero_contrato: string | null;
  remision_material: string | null;
  fecha_remision: string | null;
  constructora: string | null;
  proyecto: string | null;
  despacho: string | null;
  transporto: string | null;
  empresa_asociada: string | null;
  direccion_empresa: string | null;
  orden_de_compra: string | null;
}

