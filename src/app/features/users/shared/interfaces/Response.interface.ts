export interface User {
    id: number;
    name: string;
    email: string;
  }

// Roles

export interface getRoles {
  id_perfil : string | number;
  perfil : string | number
}

// User Response
export interface UserResponse {
  id_usuario: string;
  identificacion: string;
  nombre: string;
  apellido: string;
  email: string;
  estado: string;
  id_perfil: string | number;
  perfil: string;
}

// Delete user response

export interface StateUSer {
  message: string,
  code: number
}
  