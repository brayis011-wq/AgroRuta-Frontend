// Worker "app" de Cloudflare: sirve el frontend y reenvía /api/* al backend en Render.
//
// Con la API en el mismo dominio que la app (app.agroruta.workers.dev), la cookie de sesión
// (httpOnly) es del mismo sitio. Si el navegador hablara directo con onrender.com sería una
// cookie de terceros, y Safari/iPhone y Brave la bloquean.
//
// Solo las rutas /api/* pasan por aquí (assets.run_worker_first en wrangler.jsonc); el resto
// lo sirve Cloudflare desde los archivos estáticos sin ejecutar este código.

export default {
  /**
   * @param {Request} request
   * @param {{ API_ORIGIN: string, ASSETS: { fetch: (r: Request) => Promise<Response> } }} env
   */
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) {
      return env.ASSETS.fetch(request);
    }

    const destino = new URL(url.pathname + url.search, env.API_ORIGIN);
    const headers = new Headers(request.headers);
    // Para los logs del backend: quién llamó de verdad y por qué dominio
    const ip = request.headers.get('CF-Connecting-IP');
    if (ip) headers.set('X-Forwarded-For', ip);
    headers.set('X-Forwarded-Host', url.host);
    headers.set('X-Forwarded-Proto', 'https');

    try {
      return await fetch(destino, {
        method: request.method,
        headers,
        body: request.method === 'GET' || request.method === 'HEAD' ? null : request.body,
        redirect: 'manual',
      });
    } catch {
      // Render no respondió (por ejemplo, mientras despierta): el frontend lo trata como error de red
      return new Response(JSON.stringify({ message: 'El servidor no está disponible. Intenta de nuevo.' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  },
};
