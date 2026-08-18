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
