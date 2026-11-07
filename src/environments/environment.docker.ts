/**
 * Build para el docker-compose local (ng build --configuration=production,docker).
 * El navegador llama directo al backend del contenedor, publicado en el puerto 8080.
 */
export const environment = {
  production: true,
  apiUrl: 'http://localhost:8080',
  /** Instancia de Sentinel Hub (Copernicus Data Space) que sirve la capa NDVI. */
  sentinelInstanceId: '5838490d-ec4b-482d-84b8-f3ebc19fb69c',
  /** Días hacia atrás de imágenes satelitales que se usan para el NDVI. */
  ndviDias: 90,
};
