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

export interface RemissionResponse {
  id: number;
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

