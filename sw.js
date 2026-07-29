/* Service Worker for Daniel Workbench PWA
   - Pre-cache app shell on install
   - Network-first for the HTML so updates roll out quickly
   - Cache-first for static assets (icons, manifest)
*/
const CACHE_VERSION = 'v4';
const SHELL_CACHE = `daniel-shell-${CACHE_VERSION}`;
const ASSET_CACHE = `daniel-assets-${CACHE_VERSION}`;

const SHELL_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== SHELL_CACHE && k !== ASSET_CACHE)
          .map((k) => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Never cache cross-origin requests (e.g. GitHub API)
  if (url.origin !== self.location.origin) return;

  // Network-first for HTML so updates land immediately
  if (req.mode === 'navigate' || req.destination === 'document') {
    event.respondWith(
      fetch(req).then((resp) => {
        const copy = resp.clone();
        caches.open(SHELL_CACHE).then((c) => c.put(req, copy));
        return resp;
      }).catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
    );
    return;
  }

  // Cache-first for static assets
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((resp) => {
        if (resp.ok) {
          const copy = resp.clone();
          caches.open(ASSET_CACHE).then((c) => c.put(req, copy));
        }
        return resp;
      }).catch(() => cached);
    })
  );
});