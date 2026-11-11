/*
 * Service worker de AgroRuta: deja abrir la app sin señal.
 *
 * Solo guarda los archivos de la aplicación (HTML, JS, CSS, fuentes, iconos y textos).
 * Nunca toca /api/: los datos y los registros pendientes los maneja la propia app
 * (src/app/core/offline), que sabe de quién son y los borra al cerrar sesión.
 */
const CACHE = 'agroruta-app-v1';
const MAXIMO = 240;

/** Lo mínimo para que la app arranque sin conexión; el resto se guarda a medida que se usa */
const BASE = [
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/icon-192.png',
  '/theme-init.js',
  '/vendor/tabler-icons/tabler-icons.min.css',
  '/i18n/es.json',
  '/i18n/en.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      // Uno por uno: si un archivo falla no se pierde el resto
      .then((cache) => Promise.all(BASE.map((url) => cache.add(url).catch(() => undefined))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((nombres) => Promise.all(nombres.filter((n) => n !== CACHE && n.startsWith('agroruta-')).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

/** Archivos con huella en el nombre (main-AB12CD34.js): su contenido nunca cambia */
const CON_HUELLA = /-[A-Z0-9]{8}\.(?:js|css)$|\.(?:woff2?|ttf)$|^\/media\//;

function guardar(peticion, respuesta) {
  if (!respuesta || !respuesta.ok || respuesta.type !== 'basic') return;
  const copia = respuesta.clone();
  caches.open(CACHE).then(async (cache) => {
    await cache.put(peticion, copia);
    const claves = await cache.keys();
    // Los archivos de versiones viejas se van acumulando: se sueltan los más antiguos
    if (claves.length > MAXIMO) {
      await Promise.all(claves.slice(0, claves.length - MAXIMO + 40).map((c) => cache.delete(c)));
    }
  }).catch(() => undefined);
}

self.addEventListener('fetch', (event) => {
  const peticion = event.request;
  if (peticion.method !== 'GET') return;
  const url = new URL(peticion.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  // Abrir o recargar la app: primero la red (para recibir versiones nuevas); sin señal, la copia
  if (peticion.mode === 'navigate') {
    event.respondWith(
      fetch(peticion)
        .then((respuesta) => {
          guardar('/index.html', respuesta);
          return respuesta;
        })
        .catch(() => caches.match('/index.html').then((copia) => copia || Response.error())),
    );
    return;
  }

  if (CON_HUELLA.test(url.pathname)) {
    event.respondWith(
      caches.match(peticion).then((copia) => copia || fetch(peticion).then((respuesta) => {
        guardar(peticion, respuesta);
        return respuesta;
      })),
    );
    return;
  }

  // Textos, iconos y demás: responde con la copia y la refresca por detrás
  event.respondWith(
    caches.match(peticion).then((copia) => {
      const deLaRed = fetch(peticion).then((respuesta) => {
        guardar(peticion, respuesta);
        return respuesta;
      });
      if (!copia) return deLaRed;
      deLaRed.catch(() => undefined);
      return copia;
    }),
  );
});
