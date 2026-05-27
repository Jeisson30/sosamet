export interface RemisionPrintHeader {
  remision_material?: string | null;
  empresa_asociada?: string | number | null;
  tipo_doc_rem?: string | null;
  numero_contrato?: string | null;
  cliente?: string | null;
  proyecto?: string | null;
  direccion_empresa?: string | null;
  orden_de_compra?: string | null;
  fecha_remision?: string | null;
  despacho?: string | null;
  transporto?: string | null;
  elaboro?: string | null;
  observaciones?: string | null;
}

export interface RemisionPrintItem {
  item?: string | null;
  cantidad?: number | null;
  um?: string | null;
  detalle?: string | null;
  observaciones?: string | null;
}
