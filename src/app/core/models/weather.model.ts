export interface Weather {
  city: string;
  country: string;
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  description: string;
  iconUrl: string;
}

export type TipoConsejoClima = 'NO_FUMIGAR' | 'FUMIGAR_EN_VENTANA' | 'FUMIGAR_BIEN' | 'NO_REGAR' | 'HELADA' | 'LLUVIA_FUERTE';

/**
 * Algo que el clima cambia en lo que hay programado ("no fumigues hoy: llueve a las 3").
 * Las horas llegan como "2026-11-10T16:00:00", en hora de Colombia.
 */
export interface ConsejoClima {
  tipo: TipoConsejoClima;
  nivel: 'ALERTA' | 'PRECAUCION' | 'BIEN';
  fincaId: number;
  finca: string;
  /** null en los avisos de toda la finca (helada, lluvia fuerte) */
  lote: string | null;
  cultivo: string | null;
  /** Día de la tarea: "2026-11-10" */
  dia: string | null;
  motivo: 'LLUVIA' | 'VIENTO' | null;
  problemaDesde: string | null;
  ventanaInicio: string | null;
  ventanaFin: string | null;
  /** Milímetros de lluvia o temperatura mínima, según el tipo */
  valor: number | null;
}
