// Worker "app" de Cloudflare: sirve el frontend y reenvía /api/* al backend en Render.
//
// Con la API en el mismo dominio que la app (app.agroruta.workers.dev), la cookie de sesión
// (httpOnly) es del mismo sitio. Si el navegador hablara directo con onrender.com sería una
// cookie de terceros, y Safari/iPhone y Brave la bloquean.
//
// Solo las rutas /api/* y /sipsa/semanas pasan por aquí (assets.run_worker_first en wrangler.jsonc);
// el resto lo sirve Cloudflare desde los archivos estáticos sin ejecutar este código.

/** Si la variable API_ORIGIN no llega (por ejemplo, en una vista previa), se usa Render. */
const ORIGEN_POR_DEFECTO = 'https://agroruta-backend.onrender.com';

/**
 * Headers que no se reenvían: los cf-* y cdn-loop los pone Cloudflare para esta petición y
 * Render también está detrás de Cloudflare; host lo pone fetch según el destino.
 */
const NO_REENVIAR = /^(cf-|cdn-loop$|host$|x-forwarded-|x-real-ip$)/i;

/**
 * Precios mayoristas de SIPSA (DANE). El servidor del DANE corta la conexión segura que llega
 * desde Render, así que el backend, si no lo logra directo, los pide aquí y Cloudflare los trae.
 * Siempre es la misma consulta pública (se ignora lo que mande el cliente): no sirve para llamar
 * a otra dirección ni para mandar otra cosa al DANE. La respuesta (~70 MB) pasa en streaming.
 */
const SIPSA_URL = 'https://appweb.dane.gov.co/sipsaWS/SrvSipsaUpraBeanService';
const SIPSA_SOBRE =
  '<soap12:Envelope xmlns:soap12="http://www.w3.org/2003/05/soap-envelope"' +
  ' xmlns:s="http://servicios.sipsa.co.gov.dane/"><soap12:Body><s:promediosSipsaSemanaMadr/>' +
  '</soap12:Body></soap12:Envelope>';

/** @param {Request} request */
async function preciosSipsa(request) {
  if (request.method !== 'GET') {
    return new Response('Solo GET', { status: 405, headers: { Allow: 'GET' } });
  }
  try {
    const r = await fetch(SIPSA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/soap+xml; charset=utf-8' },
      body: SIPSA_SOBRE,
    });
    return new Response(r.body, {
      status: r.status,
      headers: {
        'Content-Type': r.headers.get('Content-Type') || 'application/soap+xml; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    console.error('SIPSA falló desde Cloudflare:', e);
    return new Response('No se pudo consultar SIPSA desde Cloudflare: ' + (e instanceof Error ? e.message : e), {
      status: 502,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}

export default {
  /**
   * @param {Request} request
   * @param {{ API_ORIGIN?: string, ASSETS: { fetch: (r: Request) => Promise<Response> } }} env
   */
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/sipsa/semanas') {
      return preciosSipsa(request);
    }
    if (!url.pathname.startsWith('/api/')) {
      return env.ASSETS.fetch(request);
    }

    try {
      const destino = new URL(url.pathname + url.search, env.API_ORIGIN || ORIGEN_POR_DEFECTO);

      const headers = new Headers();
      for (const [nombre, valor] of request.headers) {
        if (!NO_REENVIAR.test(nombre)) headers.set(nombre, valor);
      }
      // Para los logs del backend: quién llamó de verdad y por qué dominio
      const ip = request.headers.get('CF-Connecting-IP');
      if (ip) headers.set('X-Forwarded-For', ip);
      headers.set('X-Forwarded-Host', url.host);
      headers.set('X-Forwarded-Proto', 'https');

      const sinCuerpo = request.method === 'GET' || request.method === 'HEAD';
      return await fetch(destino.toString(), {
        method: request.method,
        headers,
        body: sinCuerpo ? null : await request.arrayBuffer(),
        redirect: 'manual',
      });
    } catch (e) {
      // Render no respondió (por ejemplo, mientras despierta) o algo falló aquí:
      // el frontend lo trata como error de red. El mensaje completo va solo al log del Worker
      // (puede traer direcciones internas); al navegador llega nada más el tipo de error.
      console.error('Proxy /api falló:', e);
      return new Response(
        JSON.stringify({
          message: 'El servidor no está disponible. Intenta de nuevo.',
          detalle: e instanceof Error ? e.name : 'Error',
        }),
        { status: 502, headers: { 'Content-Type': 'application/json' } },
      );
    }
  },
};
