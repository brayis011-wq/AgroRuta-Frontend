// Modelos del panel de administración (/api/admin)

export type RolUsuario = 'Administrador' | 'Agricultor' | 'Trabajador';

export const ROLES: RolUsuario[] = ['Administrador', 'Agricultor', 'Trabajador'];

export interface UsuarioAdmin {
  id: number;
  nombre: string;
  email: string;
  rol: RolUsuario;
  activo: boolean;
  telefono: string | null;
  fechaCreacion: string | null;
}

export interface ResumenAdmin {
  usuariosActivos: number;
  usuariosInactivos: number;
  administradores: number;
  agricultores: number;
  trabajadoresUsuarios: number;
  fincas: number;
  hectareas: number;
  lotes: number;
  siembrasActivas: number;
  cosechaKg: number;
  trabajadoresActivos: number;
  nominasPorPagar: number;
  totalPagado: number;
}

export interface AgricultorAdmin {
  id: number;
  nombre: string;
  email: string;
  activo: boolean;
  fechaCreacion: string | null;
  fincas: number;
  hectareas: number;
  trabajadoresActivos: number;
  nominas: number;
  totalPagado: number;
}

export interface AgricultorDetalleAdmin {
  agricultor: AgricultorAdmin;
  fincas: { id: number; nombre: string; ubicacion: string; hectareas: number }[];
  trabajadores: { id: number; nombreCompleto: string; cedula: string; cargo: string | null; estado: string | null }[];
  nominas: {
    id: number;
    trabajador: string | null;
    periodoInicio: string;
    periodoFin: string;
    totalJornales: number;
    valorTotal: number;
    estado: string | null;
  }[];
}
