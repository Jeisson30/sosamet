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

