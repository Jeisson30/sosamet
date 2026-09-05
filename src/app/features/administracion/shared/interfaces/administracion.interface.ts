export interface ConstructoraAdmin {
  id_constructora: number;
  nombre: string;
  nit: string;
  estado: string;
  fecha_creacion?: string;
}

export interface ProyectoAdmin {
  id_proyecto: number;
  nombre: string;
  id_constructora: number;
  estado: string;
  fecha_creacion?: string;
}

export interface DocumentoNumeroAdmin {
  id_documento_numero: number;
  id_constructora: number;
  constructora?: string;
  id_proyecto: number;
  proyecto?: string;
  tipo_doc: string;
  numero_documento: string;
  estado: string;
  fecha_creacion?: string;
  label?: string;
  value?: string;
}

export interface SpAdminResponse<T = unknown> {
  codigo: number;
  mensaje: string;
  data?: T;
}
