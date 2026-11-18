/**
 * Diferencia máxima (px) entre las dos columnas del Inicio para emparejarlas. Con más diferencia, estirar
 * la más corta dejaría un hueco grande dentro de una tarjeta: mejor que cada una mida lo que su contenido.
 */
export const DIFERENCIA_MAXIMA = 220;

/**
 * Empareja las columnas del Inicio si quedaron con alturas parecidas: las tarjetas visibles de la más corta
 * se reparten lo que falta, cada una según cuántas filas muestra (clases `parejo` y `estira`, ver
 * dashboard-body.css): la de tres cultivos absorbe más que la de un solo evento, y ninguna queda con un hueco. Con poca información en un lado no se estira nada. En pantallas angostas, donde todo va en
 * una columna, no hace nada.
 */
export function emparejarColumnas(cuerpo: HTMLElement | null | undefined): void {
  if (!cuerpo) return;
  const izquierda = cuerpo.querySelector<HTMLElement>('.col-principal');
  const derecha = cuerpo.querySelector<HTMLElement>('.col-lateral');
  // Se mide sin estirar: así se ve lo que mide de verdad cada columna
  cuerpo.classList.remove('parejo');
  cuerpo.querySelectorAll<HTMLElement>('.estira').forEach((e) => { e.classList.remove('estira'); e.style.flexGrow = ''; });
  if (!izquierda || !derecha || getComputedStyle(izquierda).display === 'contents') return;

  const altoIzquierda = izquierda.getBoundingClientRect().height;
  const altoDerecha = derecha.getBoundingClientRect().height;
  const diferencia = Math.abs(altoIzquierda - altoDerecha);
  if (diferencia < 1 || diferencia > DIFERENCIA_MAXIMA) return;

  const corta = altoIzquierda < altoDerecha ? izquierda : derecha;
  // Las marcadas con "fijo" (el clima) no crecen: se verían infladas
  const visibles = Array.from(corta.children)
    .filter((c) => c.getBoundingClientRect().height > 0 && !c.classList.contains('fijo'));
  if (!visibles.length) return;
  visibles.forEach((c) => {
    c.classList.add('estira');
    (c as HTMLElement).style.flexGrow = String(filasDe(c));
  });
  cuerpo.classList.add('parejo');
}

/** Filas que muestra una tarjeta (cultivos, eventos, pendientes, consejos); al menos 1 */
function filasDe(tarjeta: Element): number {
  return Math.max(1, tarjeta.querySelectorAll('a.cultivo, a.fila, li').length);
}
