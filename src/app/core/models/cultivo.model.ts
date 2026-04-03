export interface Finca {
  id?: number;
  nombre: string;
  ubicacion: string;
  hectareas: number;
  agricultorId: number;
  fechaRegistro?: string;
}

export interface Lote {
  id?: number;
  nombre: string;
  area: number;
  estado: 'DISPONIBLE' | 'EN_CULTIVO' | 'EN_DESCANSO';
  fincaId: number;
}

export interface Siembra {
  id?: number;
  fechaSiembra: string;
  cantidadPlantas: number;
  variedad: 'COLOMBIA' | 'GIGANTE' | 'KENYA';
  estadoCultivo: 'GERMINACION' | 'CRECIMIENTO' | 'PRODUCCION' | 'COSECHA' | 'FINALIZADO';
  loteId: number;
}

export interface ActividadCultivo {
  id?: number;
  tipo: 'PODA' | 'TUTOREO' | 'DESHIERBE' | 'RIEGO' | 'REVISION' | 'OTRO';
  descripcion: string;
  fecha: string;
  siembraId: number;
}

export interface Fumigacion {
  id?: number;
  fecha: string;
  producto: string;
  dosis: number;
  unidadMedida: 'LITROS' | 'ML' | 'GRAMOS' | 'KG';
  areaAplicada: number;
  observaciones?: string;
  siembraId: number;
}

export interface Cosecha {
  id?: number;
  fecha: string;
  cantidadKg: number;
  calidad: 'PRIMERA' | 'SEGUNDA' | 'TERCERA';
  observaciones?: string;
  siembraId: number;
}
