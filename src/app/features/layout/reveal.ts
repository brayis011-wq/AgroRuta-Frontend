/** Bloques del contenido que asoman al entrar en pantalla mientras se desliza (solo en el celular) */
export const BLOQUES_QUE_ASOMAN = '.tarjeta, .cv, .rep, .pref, .form-card, .tabla-wrap, .vacio';
const CELULAR = '(max-width: 760px) and (prefers-reduced-motion: no-preference)';
/** Lo que dura la animación (styles.css) más un margen, por si el navegador no avisa que terminó */
const LIMPIAR_MS = 800;

export type Entrada = 'asomar' | 'esperar' | 'dejar';

/**
 * Qué hacer con un bloque cuando el navegador avisa si está o no a la vista:
 * - lo que ya se veía al abrir la pantalla se deja quieto (la pantalla ya tiene su propia entrada);
 * - lo que está más abajo espera, y asoma cuando el dedo lo trae a la pantalla;
 * - lo que quedó arriba no se anima al volver a subir.
 */
export function alCruzar(cruza: boolean, primeraVez: boolean, arriba: number, altoPantalla: number): Entrada {
  if (cruza) return primeraVez ? 'dejar' : 'asomar';
  return arriba >= altoPantalla / 2 ? 'esperar' : 'dejar';
}

/**
 * Vigila el contenido y hace asomar cada bloque una sola vez. La animación se quita al terminar: mientras
 * dura, el bloque atrapa a los elementos fijos que tenga dentro (un diálogo quedaría recortado), así que
 * no puede quedarse puesta. Devuelve la función que deja de vigilar.
 */
export function vigilarEntradas(contenido: HTMLElement): () => void {
  if (typeof IntersectionObserver === 'undefined' || typeof MutationObserver === 'undefined') return () => {};
  const medio = window.matchMedia?.(CELULAR);
  const vistos = new WeakSet<Element>();
  const esperando = new WeakSet<Element>();

  const cruces = new IntersectionObserver((entradas) => {
    for (const e of entradas) {
      const bloque = e.target as HTMLElement;
      const alto = e.rootBounds?.height ?? window.innerHeight;
      const hacer = alCruzar(e.isIntersecting, !esperando.has(bloque), e.boundingClientRect.top, alto);
      if (hacer === 'esperar') {
        esperando.add(bloque);
        continue;
      }
      cruces.unobserve(bloque);
      if (hacer !== 'asomar' || !medio?.matches) continue;
      const limpiar = () => bloque.removeAttribute('data-asoma');
      bloque.setAttribute('data-asoma', '');
      bloque.addEventListener('animationend', limpiar, { once: true });
      setTimeout(limpiar, LIMPIAR_MS);
    }
  }, { rootMargin: '0px 0px -24px 0px' });

  let pendiente = 0;
  const revisar = () => {
    pendiente = 0;
    for (const bloque of contenido.querySelectorAll(BLOQUES_QUE_ASOMAN)) {
      if (vistos.has(bloque)) continue;
      vistos.add(bloque);
      cruces.observe(bloque);
    }
  };
  // Las pantallas pintan por partes (al llegar los datos): se revisa una vez por cuadro, no por cada cambio
  const cambios = new MutationObserver(() => {
    if (!pendiente) pendiente = requestAnimationFrame(revisar);
  });
  cambios.observe(contenido, { childList: true, subtree: true });
  revisar();

  return () => {
    cambios.disconnect();
    cruces.disconnect();
    if (pendiente) cancelAnimationFrame(pendiente);
  };
}
