export const environment = {
  production: true,
  /**
   * Vacío: la API se llama en el mismo dominio (/api/...) y el Worker de Cloudflare la reenvía a
   * Render (worker/index.js). Así la cookie de sesión es del mismo sitio y Safari no la bloquea.
   */
  apiUrl: '',
  /** Instancia de Sentinel Hub (Copernicus Data Space) que sirve la capa NDVI. */
  sentinelInstanceId: '5838490d-ec4b-482d-84b8-f3ebc19fb69c',
  /** Días hacia atrás de imágenes satelitales que se usan para el NDVI. */
  ndviDias: 90,
};
