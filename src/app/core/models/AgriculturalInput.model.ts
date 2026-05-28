// src/app/core/models/agricultural-input.model.ts

export type AgriculturalInputType =
  | 'FUNGICIDA'
  | 'INSECTICIDA'
  | 'ACARICIDA'
  | 'NEMATICIDA'
  | 'HERBICIDA'
  | 'FERTILIZANTE_FOLIAR'
  | 'FERTILIZANTE_SUELO'
  | 'REGULADOR_CRECIMIENTO'
  | 'COADYUVANTE';

export type MeasurementUnit = 'LITROS' | 'ML' | 'GRAMOS' | 'KG';

export interface AgriculturalInput {
  id: number;
  nombre: string;
  tipo: AgriculturalInputType;
  tipoDisplay: string;
  unidadSugerida: MeasurementUnit;
  dosisSugerida: number;
  reentradaHoras: number;
  activo: boolean;
  creadoEn: string;
}

export interface AgriculturalInputRequest {
  nombre: string;
  tipo: AgriculturalInputType;
  unidadSugerida: MeasurementUnit;
  dosisSugerida: number;
  reentradaHoras: number;
}
