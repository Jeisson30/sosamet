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
