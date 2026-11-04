// Portal del trabajador (/api/portal)

export type EstadoAcceso = 'SIN_SOLICITUD' | 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';

export interface EstadoPortal {
  estado: EstadoAcceso;
  trabajador: {
    nombreCompleto: string;
    cedula: string;
    cargo: string | null;
    estado: string | null;
    tipoContrato: string | null;
    fechaIngreso: string | null;
    empleador: string | null;
  } | null;
}

export interface MiJornal {
  id: number;
  fecha: string;
  cultivo: string | null;
  actividades: string[];
  valor: number;
  liquidado: boolean;
}

export interface MiNomina {
  id: number;
  periodoInicio: string;
  periodoFin: string;
  totalJornales: number;
  valorTotal: number;
  estado: 'PENDIENTE' | 'APROBADA' | 'PAGADA' | 'ANULADA' | null;
}

export interface MiPago {
  id: number;
  fechaPago: string;
  monto: number;
  metodoPago: string | null;
  comprobante: string | null;
  periodoInicio: string | null;
  periodoFin: string | null;
}
