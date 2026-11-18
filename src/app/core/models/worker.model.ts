// src/app/core/models/worker.model.ts

export interface Labor {
  id?: number;
  nombre: string;
  descripcion?: string;
  activa: boolean;
  /** Labor común del sistema: la ven todos y solo la cambia el administrador */
  comun?: boolean;
}

export interface Pago {
  id?: number;
  monto: number;
  trabajadorId?: number;
  trabajadorNombre?: string;
  /** Primera letra del nombre y del apellido (las calcula el backend) */
  trabajadorIniciales?: string | null;
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
  cedula: string;
  nombreCompleto: string;
  telefono?: string;
  direccion?: string;
  fechaIngreso?: string;
  tipoContrato?: string;
  estado?: string;
  cargo?: Cargo;
  /** Acceso al portal del trabajador: null, PENDIENTE, APROBADO o RECHAZADO */
  accesoEstado?: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | null;
  accesoNombre?: string | null;
  accesoEmail?: string | null;
}

export interface Nomina {
  id?: number;
  /** No viene del servidor: lo completa la lista de nóminas a partir de `trabajador` */
  trabajadorId?: number;
  trabajador?: Trabajador;
  periodoInicio: string | Date;
  periodoFin: string | Date;
  totalJornales: number;
  valorTotal: number;
  estado: string;
  fechaGeneracion: string | Date;
  observaciones?: string;
  jornales?: Jornal[];
}

export interface Jornal {
  id?: number;
  fecha?: string | Date;
  trabajador?: Trabajador;
  actividades?: Labor[];
  nombreCultivo?: string;
  cultivoId?: number;
  valorJornal?: number;
  liquidado?: boolean;
  observaciones?: string;
}

/** GET /api/payrolls/summary: cuántas nóminas hay en cada estado y cuánto suman. */
export interface ResumenNominas {
  estado: string;
  cantidad: number;
  total: number;
}

/** GET /api/workdays/worker/{id}/summary: totales de los jornales del trabajador en el rango pedido. */
export interface ResumenJornales {
  cantidad: number;
  valorTotal: number;
  pendientes: number;
  valorPendiente: number;
  /** Fecha del jornal sin liquidar más antiguo y del más reciente (para proponer el periodo de la nómina) */
  primeraPendiente: string | null;
  ultimaPendiente: string | null;
}

/** GET /api/workdays/home-summary: los jornales que cuenta el Inicio, ya sumados por la base. */
export interface ResumenJornalesInicio {
  /** Jornales de este mes (hasta hoy) y del mes anterior, de los trabajadores activos */
  mesActual: number;
  mesAnterior: number;
  /** Ids de los trabajadores activos que ya tienen jornal hoy */
  trabajadoresHoy: number[];
}

/** GET /api/payments/monthly: lo pagado en un mes ("2026-11"). Los meses sin pagos no vienen. */
export interface PagosDelMes {
  mes: string;
  total: number;
  cantidad: number;
}

/** GET /api/payments/summary: cuántos pagos hay, cuánto suman y a cuántos trabajadores. */
export interface ResumenPagos {
  cantidad: number;
  total: number;
  trabajadores: number;
}
