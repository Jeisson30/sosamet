export interface OrderWorkPrintHeader {
  consecutivo?: string | null;
  /** Fecha de creación / asignación del documento (cajas FECHA ASIGNADO). */
  fecha_creacion?: string | Date | null;
  /** Fecha de entrega comprometida (campo FECHA ENTREGA). */
  fecha_entrega?: string | Date | null;
  constructora?: string | null;
  proyecto?: string | null;
  tipo_documento?: string | null;
  contrato?: string | null;
  encargado?: string | null;
  observaciones?: string | null;
  autorizo?: string | null;
  tipo_actividad?: string | null;
}

export interface OrderWorkPrintItem {
  item?: string | null;
  detalle?: string | null;
  cantidad?: number | null;
  um?: string | null;
  ancho?: number | null;
  alto?: number | null;
  plano_no?: string | null;
  observaciones?: string | null;
}
