// Change password

export interface SendChangePass {
  token: string;
  p_clave_actual: string;
  p_nueva_password: string;
}

// Login

export interface SendLogin {
  p_email: string;
  p_password : string;
}
