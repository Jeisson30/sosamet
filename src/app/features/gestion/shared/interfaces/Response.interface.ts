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
  empresa_asociada_id: number | null;
  encargado_id: number | null;
  observaciones: string;
  resumen: LiquidationResumen;
  items: LiquidationItem[];
}

// Order Work Interfaces
export interface OrderWorkItem {
  ref: string;
  no_contrato: string;
  obra: string;
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
  empresa_asociada_id: number | null;
  encargado_id: number | null;
  fecha_entrega: Date | null;
  observaciones: string;
  items: OrderWorkItem[];
}
