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

