export interface RegisterRequest {
  nombre: string;
  email: string;
  password: string;
  rol: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  id: number;
  token: string;
  email: string;
  nombre: string;
  rol: string;
}
