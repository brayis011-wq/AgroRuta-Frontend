export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080',
  /** Instancia de Sentinel Hub (Copernicus Data Space) que sirve la capa NDVI. */
  sentinelInstanceId: '5838490d-ec4b-482d-84b8-f3ebc19fb69c',
  /** Días hacia atrás de imágenes satelitales que se usan para el NDVI. */
  ndviDias: 90,
};
