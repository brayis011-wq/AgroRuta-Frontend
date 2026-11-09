// Worker "app" de Cloudflare: sirve el frontend y reenvía /api/* al backend en Render.
//
// Con la API en el mismo dominio que la app (app.agroruta.workers.dev), la cookie de sesión
// (httpOnly) es del mismo sitio. Si el navegador hablara directo con onrender.com sería una
// cookie de terceros, y Safari/iPhone y Brave la bloquean.
//
// Solo las rutas /api/* pasan por aquí (assets.run_worker_first en wrangler.jsonc); el resto
// lo sirve Cloudflare desde los archivos estáticos sin ejecutar este código.

/** Si la variable API_ORIGIN no llega (por ejemplo, en una vista previa), se usa Render. */
const ORIGEN_POR_DEFECTO = 'https://agroruta-backend.onrender.com';

/**
 * Headers que no se reenvían: los cf-* y cdn-loop los pone Cloudflare para esta petición y
 * Render también está detrás de Cloudflare; host lo pone fetch según el destino.
 */
const NO_REENVIAR = /^(cf-|cdn-loop$|host$|x-forwarded-|x-real-ip$)/i;

export default {
  /**
   * @param {Request} request
   * @param {{ API_ORIGIN?: string, ASSETS: { fetch: (r: Request) => Promise<Response> } }} env
   */
  async fetch(request, env) {
    const url = new URL(request.url);
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
      // el frontend lo trata como error de red. El nombre del error ayuda a diagnosticar.
      return new Response(
        JSON.stringify({
          message: 'El servidor no está disponible. Intenta de nuevo.',
          detalle: e instanceof Error ? e.name + ': ' + e.message : String(e),
        }),
        { status: 502, headers: { 'Content-Type': 'application/json' } },
      );
    }
  },
};
