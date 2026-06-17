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

export interface SpAdminResponse<T = unknown> {
  codigo: number;
  mensaje: string;
  data?: T;
}
