import { environment } from '../../../environments/environment';

/**
 * ¿La petición va a nuestro backend? En producción apiUrl es '' (la API llega por el proxy del
 * Worker en el mismo dominio), así que se compara con "<apiUrl>/api/" y no solo con apiUrl:
 * de lo contrario cualquier URL externa (mapas, clima) recibiría el token.
 */
export function esNuestraApi(url: string | null | undefined): boolean {
  return !!url && url.startsWith(`${environment.apiUrl}/api/`);
}
