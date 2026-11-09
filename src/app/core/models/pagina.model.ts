/** Una página de resultados de la API (GET .../page). */
export interface Pagina<T> {
  contenido: T[];
  /** Número de página, desde 0 */
  pagina: number;
  tamano: number;
  /** Elementos en total, sumando todas las páginas */
  total: number;
  totalPaginas: number;
}

/** Elementos por página en las listas largas (jornales, nóminas, pagos). */
export const TAMANO_PAGINA = 20;
