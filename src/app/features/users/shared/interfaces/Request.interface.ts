// Create user

export interface CreateUserData {
  p_identificacion: string;
  p_nombre: string;
  p_apellido: string;
  p_email: string;
  p_idrol: any;
  p_idperfil: any;
}

// UPdate user

export interface UpdateUserData {
  p_nit: number;
  p_nombre: string;
  p_apellido: string;
  p_email: string;
  p_rol: string;
}

// change state user

export interface SendStateUser {
  p_id_usuario: number;
  p_nuevo_estado: string;
}
