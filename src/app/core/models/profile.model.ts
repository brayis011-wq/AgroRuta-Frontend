export interface Perfil {
  id: number;
  nombre: string;
  email: string;
  telefono: string;
  fotoPerfil: string;
  rol: Rol;
}

/** Los mismos nombres que envía el servidor (enum Rol) */
export type Rol = 'Administrador' | 'Agricultor' | 'Trabajador';

export interface UpdateProfileRequest {
  nombre: string;
  telefono: string;
  fotoPerfil: string;
}

export interface ChangePasswordRequest {
  passwordActual: string;
  nuevaPassword: string;
}
