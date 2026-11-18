// Almanaque del día para el Inicio: la fase de la luna y un dicho del campo.
// Todo se calcula en el dispositivo (funciona sin señal) y cambia una vez al día.

/** Días que tarda la luna en volver a la misma fase */
export const MES_LUNAR = 29.530588853;
/** Una luna nueva conocida: 6 de enero de 2000, 18:14 UTC */
const LUNA_NUEVA_REF = Date.UTC(2000, 0, 6, 18, 14);
/** Margen (en días) alrededor de la luna nueva y de la llena en que se las nombra así */
const MARGEN = 1.85;

export type FaseLuna = 'nueva' | 'creciente' | 'llena' | 'menguante';

/** Cuántos dichos hay en los textos (almanaque.sayings.s1 … sN) */
export const TOTAL_DICHOS = 12;

export interface Almanaque {
  fase: FaseLuna;
  /** Parte iluminada del disco, de 0 (nueva) a 1 (llena) */
  iluminada: number;
  /** Trazo SVG de la parte iluminada, en un disco de radio 10 centrado en el origen */
  camino: string;
  /** Número del dicho del día, de 1 a TOTAL_DICHOS */
  dicho: number;
}

/** Días transcurridos desde la última luna nueva (0 a 29,53) */
export function edadLuna(fecha: Date): number {
  const dias = (fecha.getTime() - LUNA_NUEVA_REF) / 86_400_000;
  return ((dias % MES_LUNAR) + MES_LUNAR) % MES_LUNAR;
}

/** Las cuatro fases del almanaque: nueva y llena duran unos días; el resto es creciente o menguante */
export function faseLuna(fecha: Date): FaseLuna {
  const edad = edadLuna(fecha);
  const mitad = MES_LUNAR / 2;
  if (edad < MARGEN || edad > MES_LUNAR - MARGEN) return 'nueva';
  if (Math.abs(edad - mitad) < MARGEN) return 'llena';
  return edad < mitad ? 'creciente' : 'menguante';
}

/** Parte iluminada del disco (0 a 1) */
export function iluminacion(fecha: Date): number {
  return (1 - Math.cos((2 * Math.PI * edadLuna(fecha)) / MES_LUNAR)) / 2;
}

/**
 * Trazo de la parte iluminada: medio disco más el borde curvo de la sombra (una media elipse).
 * En creciente la luz va a la derecha y en menguante a la izquierda.
 */
export function caminoLuna(fecha: Date, radio = 10): string {
  const edad = edadLuna(fecha);
  const creciente = edad < MES_LUNAR / 2;
  const coseno = Math.cos((2 * Math.PI * edad) / MES_LUNAR);
  const rx = +(Math.abs(coseno) * radio).toFixed(2);
  // Lado iluminado: derecha (1) en creciente, izquierda (0) en menguante
  const lado = creciente ? 1 : 0;
  // Menos de media luna: el borde de la sombra se curva hacia el lado iluminado; más de media, hacia el otro
  const borde = coseno > 0 ? 1 - lado : lado;
  return `M0 ${-radio}A${radio} ${radio} 0 0 ${lado} 0 ${radio}A${rx} ${radio} 0 0 ${borde} 0 ${-radio}Z`;
}

/** Día del año, de 1 a 366, en la hora del dispositivo */
export function diaDelAnio(fecha: Date): number {
  const inicio = new Date(fecha.getFullYear(), 0, 1);
  const hoy = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
  return Math.round((hoy.getTime() - inicio.getTime()) / 86_400_000) + 1;
}

export function almanaqueDe(fecha: Date): Almanaque {
  return {
    fase: faseLuna(fecha),
    iluminada: iluminacion(fecha),
    camino: caminoLuna(fecha),
    dicho: ((diaDelAnio(fecha) - 1) % TOTAL_DICHOS) + 1,
  };
}
