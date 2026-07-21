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
// v5: íconos nuevos. Los íconos son de las pocas rutas SIN hash en el nombre,
// así que la rama cache-first de abajo seguiría sirviendo los viejos para
// siempre; subir el nombre de la caché es lo que fuerza que se vuelvan a pedir.
// v6: se agrega el handler de `notificationclick`.
const CACHE_NAME = 'nutritrack-v6';
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

// Tocar un recordatorio trae la app al frente en vez de no hacer nada.
//
// Los recordatorios como notificación del sistema solo salen en Android/escritorio
// (ver notifyInBackground en src/reminders.js); en iPhone son banner in-app. Sin
// este handler, en esas plataformas el toque abría —según el navegador— una
// pestaña suelta o nada. Acá se reutiliza una ventana ya abierta de la app si la
// hay, y solo se abre una nueva si no quedaba ninguna.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow ? self.clients.openWindow('/') : undefined;
    })
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
