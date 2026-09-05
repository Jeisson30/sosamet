export interface Company {
  id: number;
  nit: string;
  nombre_empresa: string;
  estado: number;
}

// Users

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export interface GestionUser {
  id_usuario: number;
  identificacion: string;
  nombre: string;
  apellido: string;
  email: string;
  id_perfil: number;
  perfil: string;
  estado: 'ACTIVO' | 'INACTIVO';
  fecha_creacion: string;        
  fecha_actualizacion: string;
  displayName?: string;
}

// Liquidation Interfaces
export interface LiquidationItem {
  ref: string;
  no_orden: string;
  no_contrato: string;
  /** CONTRATO | COTIZACION */
  tipo_vinculo?: 'CONTRATO' | 'COTIZACION';
  obra: string;
  item: string;
  descripcion: string;
  cantidad: number;
  um: string;
  ancho: number;
  alto: number;
  observaciones: string;
  vr_unitario: number;
  vr_total: number;
}

export interface LiquidationResumen {
  subtotal: number;
  seguridad_social: number;
  maquinaria_aseo: number;
  casino: number;
  prestamos: number;
  otros: number;
  total: number;
}

export interface LiquidationPayload {
  consecutivo: string;
  nombre_corte: string;
  tipo_corte: string;
  empresa_asociada_id: number | null;
  encargado_id: number | null;
  observaciones: string;
  resumen: LiquidationResumen;
  /** Si true, no_contrato de ítems se trata como cotización */
  sin_contrato?: boolean;
  items: LiquidationItem[];
}

// Order Work Interfaces
export interface OrderWorkItem {
  ref: string;
  item: string;
  descripcion: string;
  cantidad: number;
  um: string;
  ancho: number;
  alto: number;
  observaciones: string;
}

export interface OrderWorkPayload {
  consecutivo: string;
  tipo_corte: string;
  empresa_asociada_id: number | null;
  encargado_id: number | null;
  fecha_entrega: Date | null;
  observaciones: string;
  ot_constructora: string;
  ot_proyecto: string;
  ot_tipo_documento: string;
  ot_contrato: string;
  ot_autorizo: string;
  ot_tipo_vinculo?: 'CONTRATO' | 'COTIZACION';
  items: OrderWorkItem[];
}

/** Actas/planos disponibles para asignar OT (SP_CONSULTAR_ACTAS_PLANOS_DISPONIBLES_OT) */
export interface OtActaPlanoHeader {
  consecutivo: string;
  constructora: string | null;
  proyecto: string | null;
  numero_contrato: string | null;
  fecha_acta: string | null;
  tipo_documento: string | null;
  fecha_terminacion: string | null;
  observaciones: string | null;
  descripcion_general: string | null;
  estado_acta: string | number | null;
  id_disenador: string | number | null;
  disenador: string | null;
  amd_id?: number | null;
  consecutivo_plano: string | null;
  fecha_enviado: string | null;
  fecha_aprobado: string | null;
  estado_plano: number | null;
  /** 2 = disponible, 4 = ya asignada a OT */
  estado_asignacion?: number | null;
  id_order_work?: number | null;
  consecutivo_orden_trabajo?: string | null;
  encargado_orden_trabajo?: number | null;
  encargado?: string | null;
  fecha_entrega_orden?: string | null;
  tipo_actividad?: string | null;
  ot_autorizo?: string | null;
  ot_estado?: number | string | null;
  total_items: number | null;
}

export interface OtActaPlanoDetalle {
  amd_id: number;
  consecutivo_acta: string;
  consecutivo_plano: string | null;
  numero_contrato: string | null;
  item: string | null;
  detalle: string | null;
  cantidad: number | null;
  unidad_medida: string | null;
  ancho: number | null;
  alto: number | null;
  observaciones_item: string | null;
  evidencia: string | null;
  evidencia_item: string | null;
  fecha_enviado: string | null;
  fecha_aprobado: string | null;
  estado_item: number | null;
  fecha_creacion: string | null;
  usuario_creacion_id: number | null;
  usuario_creacion: string | null;
  fecha_modificacion: string | null;
  usuario_modificacion_id: number | null;
  usuario_modificacion: string | null;
  /** 2 = disponible, 4 = ya asignada a OT */
  estado_asignacion?: number | null;
  id_order_work?: number | null;
  consecutivo_orden_trabajo?: string | null;
  encargado_orden_trabajo?: number | null;
  encargado?: string | null;
  fecha_entrega_orden?: string | null;
  tipo_actividad?: string | null;
  ot_autorizo?: string | null;
  ot_estado?: number | string | null;
}

export interface OtActasPlanosDisponiblesResponse {
  dashboard: {
    pendientes: number;
    finalizadas: number;
    total: number;
  };
  cabecera: OtActaPlanoHeader[];
  detalle: OtActaPlanoDetalle[];
}

export interface CrearOrdenTrabajoAsignadaPayload {
  consecutivo: string;
  empresa_asociada_id: number | null;
  encargado_id: number;
  fecha_entrega: Date | string;
  observaciones: string;
  tipo_actividad: string;
  ot_constructora: string;
  ot_proyecto: string;
  ot_tipo_documento: string;
  ot_contrato: string;
  ot_autorizo: string;
  items: Array<{ amd_id: number }>;
}

export interface CrearOrdenTrabajoAsignadaResponse {
  Codigo: number;
  Mensaje: string;
  id_order_work?: number | null;
  consecutivo?: string | null;
  estado?: number | null;
}

/** Consulta OT — SP_CONSULTAR_ORDENES_TRABAJO */
export interface OrdenTrabajoHeader {
  id_order_work: number;
  consecutivo: string;
  empresa_asociada_id: number | null;
  empresa_asociada: string | null;
  encargado_id: number;
  encargado: string | null;
  fecha_entrega: string | null;
  observaciones: string | null;
  tipo_actividad: string | null;
  fecha_creacion: string | null;
  fecha_actualizacion: string | null;
  constructora: string | null;
  proyecto: string | null;
  tipo_documento: string | null;
  numero_contrato: string | null;
  autorizo: string | null;
  estado: number | null;
  total_items: number | null;
  consecutivos_acta: string | null;
  consecutivos_plano: string | null;
  /** Calculado en front */
  tiempo_transcurrido?: number | null;
}

export interface OrdenTrabajoDetalle {
  id_order_work_detail: number;
  id_order_work: number;
  consecutivo_orden: string;
  amd_id: number | null;
  ref: string | null;
  item: string | null;
  descripcion: string | null;
  cantidad: number | null;
  um: string | null;
  ancho: number | null;
  alto: number | null;
  observaciones_item: string | null;
  fecha_creacion_item: string | null;
  consecutivo_acta: string | null;
  consecutivo_plano: string | null;
  contrato_acta: string | null;
  evidencia_acta: string | null;
  evidencia_plano: string | null;
  fecha_enviado_plano: string | null;
  fecha_aprobado_plano: string | null;
  estado_plano: number | null;
  /** Estado ejecución por ítem (1 pend · 2 completado). Puede venir null si BD aún no tiene columna. */
  owd_estado?: number | null;
}

export interface ConsultOrdenesTrabajoResponse {
  cabecera: OrdenTrabajoHeader[];
  detalle: OrdenTrabajoDetalle[];
}

export interface UpdateOrdenTrabajoRequest {
  id_order_work: number;
  actualizar_cabecera?: boolean;
  actualizar_detalle?: boolean;
  encargado_id?: number | null;
  fecha_entrega?: string | Date | null;
  observaciones?: string | null;
  tipo_actividad?: string | null;
  constructora?: string | null;
  proyecto?: string | null;
  tipo_documento?: string | null;
  numero_contrato?: string | null;
  autorizo?: string | null;
  empresa_asociada_id?: number | null;
  id_order_work_detail?: number | null;
  item?: string | null;
  ref?: string | null;
  descripcion?: string | null;
  cantidad?: number | null;
  um?: string | null;
  ancho?: number | null;
  alto?: number | null;
  observaciones_item?: string | null;
}

export interface MantOrdenTrabajoResponse {
  mensaje: string;
  resultado?: number;
  id_order_work?: number;
  estado?: number;
}

export interface FinalizarEjecucionCortesPayload {
  id_order_work: number;
  empresa_asociada_id: number;
  encargado_id?: number | null;
  tipo_corte: string;
  observaciones?: string | null;
  items: Array<{
    id_order_work_detail: number;
    checked: boolean;
    owd_estado: number;
  }>;
}

export interface FinalizarEjecucionCortesResponse {
  Codigo: number;
  Mensaje: string;
  id_ejecucion?: number;
  consecutivo?: string;
  id_order_work?: number;
  estado?: number;
  adicionales_guardados?: number;
}

export interface ItemCompletadoEjecucion {
  id_order_work_detail: number | null;
  id_order_work: number | null;
  orden_trabajo: string | null;
  proyecto: string | null;
  contrato_no: string | null;
  fecha_inicio: string | null;
  fecha_finalizado: string | null;
  item: string | null;
  descripcion: string | null;
  cantidad: number | null;
  um: string | null;
  ancho: number | null;
  alto: number | null;
  estado: number | null;
  id_ejecucion?: number | null;
  consecutivo_ejecucion?: string | null;
  empresa_asociada_id?: number | null;
  empresa_asociada?: string | null;
  tipo_corte?: string | null;
  encargado_id?: number | null;
  encargado?: string | null;
  /** OT = ítem de orden · ADICIONAL = actividad adicional del usuario */
  origen?: 'OT' | 'ADICIONAL' | string | null;
  id_adicional?: number | null;
  tipo_actividad?: string | null;
}

export interface ConsultItemsCompletadosResponse {
  items: ItemCompletadoEjecucion[];
}

export interface ActividadAdicionalDto {
  id_adicional?: number;
  id_ejecucion?: number | null;
  id_order_work?: number | null;
  usuario_id?: number | null;
  empresa_id?: number | null;
  empresa_nombre?: string | null;
  tipo_actividad?: string | null;
  item?: string | null;
  contrato_no?: string | null;
  tipo_vinculo?: 'CONTRATO' | 'COTIZACION' | string | null;
  proyecto?: string | null;
  descripcion?: string | null;
  cantidad?: number | null;
  um?: string | null;
  ancho?: number | null;
  alto?: number | null;
  acta_medida_no?: string | null;
  orden_no?: string | null;
  plano_no?: string | null;
  observaciones?: string | null;
  adc_estado?: number | null;
  adc_fecha_finalizado?: string | null;
  fecha_creacion?: string | null;
}

export interface GuardarAdicionalesOtPayload {
  actividades_adicionales: Array<{
    id_adicional?: number | null;
    empresa_id?: number | null;
    tipo_actividad?: string | null;
    id_order_work?: number | null;
    item?: string;
    contrato_no?: string;
    tipo_vinculo?: 'CONTRATO' | 'COTIZACION';
    proyecto?: string;
    descripcion?: string;
    cantidad?: number | null;
    um?: string;
    ancho?: number | null;
    alto?: number | null;
    acta_medida_no?: string;
    orden_no?: string;
    plano_no?: string;
    observaciones?: string;
    checked?: boolean;
    adc_estado?: number;
  }>;
}

export interface GuardarAdicionalesOtResponse {
  Codigo: number;
  Mensaje: string;
  usuario_id?: number;
  guardados?: number;
  items?: ActividadAdicionalDto[];
}

export interface ConsultAdicionalesOtResponse {
  items: ActividadAdicionalDto[];
}

/** Trazabilidad OT → Acta → Plano → Ejecución */
export interface TrazabilidadOtCabecera {
  id_order_work: number;
  consecutivo: string;
  estado: number | null;
  tipo_actividad: string | null;
  fecha_entrega: string | null;
  observaciones: string | null;
  fecha_creacion: string | null;
  fecha_actualizacion: string | null;
  constructora: string | null;
  proyecto: string | null;
  tipo_documento: string | null;
  numero_contrato: string | null;
  autorizo: string | null;
  encargado_id: number | null;
  encargado: string | null;
  empresa_asociada_id: number | null;
  empresa_asociada_ot: string | null;
  id_ejecucion: number | null;
  consecutivo_ejecucion: string | null;
  empresa_ejecucion_id: number | null;
  empresa_ejecucion: string | null;
  tipo_corte_ejecucion: string | null;
  observaciones_ejecucion: string | null;
  estado_ejecucion: number | null;
  fecha_creacion_ejecucion: string | null;
  fecha_finalizado_ejecucion: string | null;
  total_items: number | null;
  items_completados: number | null;
  consecutivos_acta: string | null;
  consecutivos_plano: string | null;
}

export interface TrazabilidadOtItem {
  id_order_work_detail: number;
  id_order_work: number;
  consecutivo_orden: string | null;
  amd_id: number | null;
  ref: string | null;
  item: string | null;
  descripcion: string | null;
  cantidad: number | string | null;
  um: string | null;
  ancho: number | string | null;
  alto: number | string | null;
  observaciones_item: string | null;
  owd_estado: number | null;
  owd_fecha_finalizado: string | null;
  fecha_creacion_item: string | null;
  consecutivo_acta: string | null;
  consecutivo_plano: string | null;
  contrato_acta: string | null;
  detalle_acta_item: string | null;
  cantidad_acta: number | string | null;
  um_acta: string | null;
  ancho_acta: number | string | null;
  alto_acta: number | string | null;
  observaciones_acta_item: string | null;
  evidencia_acta: string | null;
  evidencia_plano: string | null;
  fecha_enviado_plano: string | null;
  fecha_aprobado_plano: string | null;
  estado_plano: number | null;
}

export interface TrazabilidadOtActa {
  consecutivo_acta: string;
  constructora: string | null;
  proyecto: string | null;
  numero_contrato: string | null;
  estado_acta: string | null;
  fecha_acta: string | null;
  fecha_terminacion: string | null;
  tipo_documento: string | null;
  detalle_acta: string | null;
  observaciones_acta: string | null;
  despiece_material: string | null;
  acta_produccion: string | null;
  id_disenador: string | null;
  disenador: string | null;
  foto_1: string | null;
  foto_2: string | null;
  foto_3: string | null;
  planos_vinculados: string | null;
}

export interface ConsultTrazabilidadOtResponse {
  Codigo: number;
  Mensaje: string;
  cabecera: TrazabilidadOtCabecera | null;
  items: TrazabilidadOtItem[];
  actas: TrazabilidadOtActa[];
}

/** Fila de consulta Ejecución de Cortes */
export interface EjecucionCorteConsultRow {
  id_ejecucion: number | null;
  consecutivo_corte: string | null;
  id_order_work: number;
  consecutivo_ot: string | null;
  encargado_id: number | null;
  encargado: string | null;
  tipo_corte: string | null;
  empresa_asociada_id: number | null;
  empresa_asociada: string | null;
  observaciones: string | null;
  estado: number | null;
  estado_label: string | null;
  fecha_creacion: string | null;
  fecha_terminada: string | null;
  constructora: string | null;
  proyecto: string | null;
  numero_contrato: string | null;
  origen: 'EJECUCION' | 'OT' | string;
}

export interface ConsultEjecucionesCorteResponse {
  Codigo: number;
  Mensaje: string;
  ve_todas: boolean;
  items: EjecucionCorteConsultRow[];
}

export interface UpdateEjecucionCorteRequest {
  id_ejecucion: number;
  empresa_asociada_id: number;
  encargado_id: number;
  tipo_corte: string;
  observaciones?: string | null;
}

export interface MantEjecucionCorteResponse {
  Codigo: number;
  Mensaje: string;
  id_ejecucion?: number;
  id_order_work?: number | null;
  estado?: number;
}

export interface ContratoOption {
  numero_contrato: string;
  label: string;
  value: string;
  [key: string]: unknown;
}

export interface ConsultContratosResponse {
  data: ContratoOption[];
}
