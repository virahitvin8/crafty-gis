/* ═══════════════════════════════════════════════════════════
   FarmHealth — Service Worker (PWA Offline Support)
   ═══════════════════════════════════════════════════════════ */

const CACHE_NAME = 'farmhealth-v1';
const ASSETS_TO_CACHE = [
  './index.html',
  './css/style.css',
  './js/config.js',
  './js/utils.js',
  './js/api.js',
  './js/map.js',
  './js/ui.js',
  './js/analysis.js',
  './js/app.js',
  './manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap'
];

// Install: cache app shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: try network first, fall back to cache
self.addEventListener('fetch', event => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // API calls: network-only (no stale data)
  const url = new URL(event.request.url);
  if (url.hostname !== location.hostname && 
      (url.hostname.includes('sentinel-hub') || 
       url.hostname.includes('googleapis') ||
       url.hostname.includes('open-meteo') ||
       url.hostname.includes('isric.org'))) {
    return; // Don't cache API responses
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache successful responses for later
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      })
      .catch(() => {
        // Offline: serve from cache
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          // For navigation, return index.html
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return new Response('Offline', { status: 503 });
        });
      })
  );
});
