export interface Perfil {
  id: number;
  nombre: string;
  email: string;
  telefono: string;
  fotoPerfil: string;
  rol: Rol;
}

export type Rol = 'ADMINISTRADOR' | 'AGRICULTOR' | 'OPERARIO';

export interface UpdateProfileRequest {
  nombre: string;
  telefono: string;
  fotoPerfil: string;
}

export interface ChangePasswordRequest {
  passwordActual: string;
  nuevaPassword: string;
}
