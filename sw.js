/* Service Worker for Daniel Workbench — v5
   - NEVER cache HTML — always fetch fresh from network
   - Cache static assets only (icons, manifest)
   - On activate: wipe all old caches + claim clients immediately
*/

const CACHE_VERSION = 'v5';
const STATIC_CACHE = `daniel-static-${CACHE_VERSION}`;

const STATIC_FILES = [
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

// Install: pre-cache static assets only (NO HTML)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(STATIC_FILES))
      .then(() => self.skipWaiting())
  );
});

// Activate: delete ALL old caches, then claim every open page
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== STATIC_CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // HTML / navigation → ALWAYS network first, NEVER cache
  if (req.mode === 'navigate' || req.destination === 'document') {
    event.respondWith(
      fetch(req).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Static assets → cache-first
  event.respondWith(
    caches.match(req).then((cached) =>
      cached || fetch(req).then((resp) => {
        if (resp.ok) {
          const copy = resp.clone();
          caches.open(STATIC_CACHE).then((c) => c.put(req, copy));
        }
        return resp;
      })
    )
  );
});
