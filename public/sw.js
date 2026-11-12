/*
 * Service worker de AgroRuta: deja abrir la app sin señal.
 *
 * Solo guarda los archivos de la aplicación (HTML, JS, CSS, fuentes, iconos y textos).
 * Nunca toca /api/: los datos y los registros pendientes los maneja la propia app
 * (src/app/core/offline), que sabe de quién son y los borra al cerrar sesión.
 */
const CACHE = 'agroruta-app-v2';
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
      // cache: 'reload' = pedirlo al servidor, sin usar una copia vieja que tenga el navegador
      .then((cache) => Promise.all(BASE.map((url) => cache.add(new Request(url, { cache: 'reload' })).catch(() => undefined))))
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

  // Textos de la app: siempre los de la versión publicada. Con una copia vieja, las pantallas
  // nuevas mostrarían la clave ("diagnostico.title") en vez del texto. La copia es solo para cuando no hay señal.
  if (url.pathname.startsWith('/i18n/')) {
    event.respondWith(
      fetch(peticion, { cache: 'no-cache' })
        .then((respuesta) => {
          guardar(peticion, respuesta);
          return respuesta;
        })
        .catch(() => caches.match(peticion).then((copia) => copia || Response.error())),
    );
    return;
  }

  // Iconos y demás: responde con la copia y la refresca por detrás
  event.respondWith(
    caches.match(peticion).then((copia) => {
      const deLaRed = fetch(peticion, { cache: 'no-cache' }).then((respuesta) => {
        guardar(peticion, respuesta);
        return respuesta;
      });
      if (!copia) return deLaRed;
      deLaRed.catch(() => undefined);
      return copia;
    }),
  );
});

// ───────────── Avisos push ─────────────
// El servidor manda { title, body, url, tag } cifrado; aquí se muestra como notificación del sistema.

self.addEventListener('push', (event) => {
  let aviso = {};
  try {
    aviso = event.data ? event.data.json() : {};
  } catch (e) {
    aviso = { body: event.data ? event.data.text() : '' };
  }
  event.waitUntil(
    self.registration.showNotification(aviso.title || 'AgroRuta', {
      body: aviso.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: aviso.tag || undefined,
      data: { url: aviso.url || '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const destino = new URL((event.notification.data && event.notification.data.url) || '/', self.location.origin);
  // Solo pantallas de la propia app
  if (destino.origin !== self.location.origin) return;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((ventanas) => {
      const abierta = ventanas.find((v) => 'focus' in v);
      if (!abierta) return self.clients.openWindow(destino.href);
      return abierta.focus().then((v) => (v && 'navigate' in v ? v.navigate(destino.href).catch(() => undefined) : undefined));
    }),
  );
});
