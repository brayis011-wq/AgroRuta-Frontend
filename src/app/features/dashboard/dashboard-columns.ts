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

/** Dónde va el clima del Inicio: en una columna, o abajo a lo ancho (franja baja) */
export type LugarClima = 'derecha' | 'izquierda' | 'abajo';

/** Separación entre tarjetas de una columna (gap de .col-principal y .col-lateral) */
const SEPARACION = 16;
/** Alto del clima en una columna cuando todavía no se ha podido medir */
export const ALTO_CLIMA = 310;

/**
 * Elige dónde poner el clima para que las dos columnas terminen lo más parejas posible: junto a
 * Pendientes (lo normal), al final de la columna izquierda, o abajo a lo ancho cuando hay poca
 * información y en cualquier columna dejaría un hueco. Se mide sin el clima, así la decisión no
 * cambia al moverlo. En pantallas angostas (una sola columna) siempre va a la derecha.
 */
export function elegirLugarClima(cuerpo: HTMLElement | null | undefined, altoClima = ALTO_CLIMA): LugarClima {
  if (!cuerpo) return 'derecha';
  const izquierda = cuerpo.querySelector<HTMLElement>('.col-principal');
  const derecha = cuerpo.querySelector<HTMLElement>('.col-lateral');
  if (!izquierda || !derecha || getComputedStyle(izquierda).display === 'contents') return 'derecha';

  const izq = altoSinClima(izquierda);
  const der = altoSinClima(derecha);
  const conClima = altoClima + SEPARACION;
  const opciones: [LugarClima, number][] = [
    ['derecha', Math.abs(izq - (der + conClima))],
    ['izquierda', Math.abs(izq + conClima - der)],
    ['abajo', Math.abs(izq - der)],
  ];
  // Gana la que deja menos diferencia; si la de siempre (derecha) ya queda pareja, se respeta
  if (opciones[0][1] <= DIFERENCIA_MAXIMA / 2) return 'derecha';
  return opciones.reduce((mejor, o) => (o[1] < mejor[1] ? o : mejor))[0];
}

/** Alto de las tarjetas visibles de una columna sin contar el clima ni lo estirado al emparejar */
function altoSinClima(columna: HTMLElement): number {
  const altos = Array.from(columna.children)
    .filter((c) => !c.classList.contains('clima'))
    .map((c) => c.getBoundingClientRect().height)
    .filter((h) => h > 0);
  return altos.reduce((s, h) => s + h, 0) + Math.max(0, altos.length - 1) * SEPARACION;
}

/** Quita lo estirado de una pasada anterior, para medir lo que mide de verdad cada tarjeta */
export function soltarColumnas(cuerpo: HTMLElement | null | undefined): void {
  if (!cuerpo) return;
  cuerpo.classList.remove('parejo');
  cuerpo.querySelectorAll<HTMLElement>('.estira').forEach((e) => { e.classList.remove('estira'); e.style.flexGrow = ''; });
}
