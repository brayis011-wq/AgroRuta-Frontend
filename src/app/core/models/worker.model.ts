// src/app/core/models/worker.model.ts

export interface Actividad {
  id?: number;
  nombre: string;
  descripcion?: string;
  activa: boolean;
}

export interface Pago {
  id?: number;
  monto: number;
  fecha: string;
  trabajadorNombre?: string;
  nominaId?: number;
  fechaPago?: string | Date;
  metodoPago?: string;
  comprobante?: string;
  observaciones?: string;
}

export interface Cargo {
  id?: number;
  nombre: string;
  descripcion: string;
  valorJornal: number;
  activo: boolean;
}

export interface Trabajador {
  id?: number;
  nombre: string;
  apellido: string;
  cedula: string;           // ← corregido (era 'documento')
  nombreCompleto: string;
  telefono?: string;
  direccion?: string;
  fechaIngreso?: string;
  tipoContrato?: string;
  estado?: string;
  cargo?: Cargo;
}

export interface Nomina {
  id?: number;
  trabajadorId: number;
  trabajador?: Trabajador;
  periodoInicio: string | Date;
  periodoFin: string | Date;
  totalJornales: number;
  valorTotal: number;
  estado: string;
  fechaGeneracion: string | Date;
  jornales?: Jornal[];
}

export interface Jornal {
  id?: number;
  trabajadorId: number;
  actividadId: number;
  pago: number;
  fecha?: string | Date;
  trabajador?: Trabajador;
  actividades?: Actividad[];
  nombreCultivo?: string;
  cultivoId?: number;
  valorJornal?: number;
  liquidado?: boolean;
  observaciones?: string;
  actividadIds?: number[];
}
