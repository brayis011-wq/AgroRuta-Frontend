export interface RegisterRequest {
  nombre: string;
  email: string;
  password: string;
  rol: string;
  /** Obligatoria si rol = Trabajador: la cédula con la que lo registró su empleador */
  cedula?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  /** Código de la app de autenticación (o uno de respaldo) si la cuenta tiene verificación en dos pasos */
  codigo?: string;
}

export interface AuthResponse {
  id: number;
  token: string;
  email: string;
  nombre: string;
  rol: string;
  /** La cuenta se creó pero falta confirmar el correo (no trae token) */
  verificacionPendiente?: boolean;
}
