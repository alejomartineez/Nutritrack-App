// Service worker.
//
// Estrategia pensada para que las actualizaciones se vean solas al abrir la app,
// sin tener que forzar el cierre:
//   - HTML / navegación  -> NETWORK-FIRST: siempre intenta la versión más nueva
//     (así el index.html apunta a los JS/CSS nuevos). Si no hay red, usa la caché.
//   - JS/CSS/imágenes    -> CACHE-FIRST con revalidación: son archivos con hash en
//     el nombre, o sea inmutables, así que servir de caché es seguro y rápido.
//
// Subir CACHE_NAME en cada cambio de esta lógica limpia las cachés viejas.
const CACHE_NAME = 'nutritrack-v4';
const APP_SHELL = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting(); // el SW nuevo no espera: activa apenas termina de instalar
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()) // toma control de las pestañas ya abiertas
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // Peticiones a otros orígenes (la API de Open Food Facts) van directo a la red:
  // la rama cache-first de abajo las serviría obsoletas para siempre, y además no
  // tiene sentido guardar respuestas de API junto al app shell.
  if (new URL(req.url).origin !== self.location.origin) return;

  const isNavigation =
    req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');

  if (isNavigation) {
    // Network-first: la versión de red gana; la caché es solo el respaldo offline.
    event.respondWith(
      fetch(req)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copy));
          return response;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match('/index.html')))
    );
    return;
  }

  // Assets con hash: cache-first, revalidando en segundo plano por si acaso.
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(req);
      const network = fetch(req)
        .then((response) => {
          if (response && response.status === 200) cache.put(req, response.clone());
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
