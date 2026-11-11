export type TipoProblema = 'PLAGA' | 'ENFERMEDAD' | 'DEFICIENCIA' | 'DANO_AMBIENTAL' | 'SANA' | 'INDETERMINADO';
export type ConfianzaDiagnostico = 'ALTA' | 'MEDIA' | 'BAJA';

/** Diagnóstico de una foto, guardado en la bitácora de la siembra */
export interface DiagnosticoPlaga {
  id: number;
  siembraId: number;
  /** "2026-11-11T10:00:00" (hora de Colombia) */
  fecha: string;
  nota: string | null;
  problema: string;
  tipo: TipoProblema;
  confianza: ConfianzaDiagnostico;
  sintomas: string | null;
  recomendaciones: string[];
  otrasPosibilidades: string[];
  advertencia: string | null;
}

export interface DiagnosticosSiembra {
  /** false si el servidor no tiene activado el análisis de fotos */
  disponible: boolean;
  /** Fotos que todavía se pueden analizar hoy */
  restantesHoy: number;
  diagnosticos: DiagnosticoPlaga[];
}
