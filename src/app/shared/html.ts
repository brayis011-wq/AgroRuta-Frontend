// Leaflet recibe el contenido de popups y tooltips como HTML. Angular escapa solo lo que pasa por
// sus plantillas, así que el texto que escribe la gente (nombre de la finca, del lote...) hay que
// escaparlo a mano antes de meterlo en esas cadenas.

const ENTIDADES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/** Convierte un valor en texto seguro para insertar dentro de HTML (contenido o atributo entre comillas). */
export function escaparHtml(valor: unknown): string {
  return String(valor ?? '').replace(/[&<>"']/g, (c) => ENTIDADES[c]);
}
