/**
 * Service Worker de FitTrack Pro.
 *
 * Stratégie : « network-first » pour le code de l'application (HTML, JS, CSS)
 * avec repli immédiat sur le cache, et « cache-first » pour les ressources
 * immuables (icônes, polices).
 *
 * L'ancienne version servait tout depuis le cache sans jamais le rafraîchir :
 * une fois l'application installée sur le téléphone, aucune mise à jour ne
 * pouvait plus lui parvenir.
 */
const CACHE_NAME = 'fitness-tracker-v2';

const APP_SHELL = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/utils.js',
  '/js/store.js',
  '/js/app.js',
  '/js/coach.js',
  '/manifest.json'
];

const STATIC_ASSETS = [
  '/assets/icon-192.png',
  '/assets/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      // addAll échoue en bloc si une seule ressource manque : on met en cache
      // individuellement pour qu'une police injoignable ne casse pas l'install.
      .then((cache) => Promise.all(
        APP_SHELL.concat(STATIC_ASSETS).map((url) =>
          cache.add(url).catch((err) => console.warn('Ressource non mise en cache:', url, err))
        )
      ))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      ))
      .then(() => self.clients.claim())
  );
});

/** Le code de l'application doit pouvoir être mis à jour. */
function isAppShell(request, url) {
  return request.mode === 'navigate' ||
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('/');
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch (e) {
    return;
  }

  // Les appels d'API (synchronisation, recherche web) ne sont jamais mis en cache.
  if (url.origin !== self.location.origin && !STATIC_ASSETS.includes(request.url)) {
    return;
  }

  if (isAppShell(request, url)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const copie = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copie));
          }
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const copie = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copie));
        }
        return response;
      });
    })
  );
});
