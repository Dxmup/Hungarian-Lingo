/* Offline shell for Hungarian Lingo.
 *
 * Everything the app needs is static, so the cache holds the whole app.
 * Bump CACHE_VERSION on any release to retire the old files.
 */

const CACHE_VERSION = 'hl-v4';

const ASSETS = [
  '.',
  'index.html',
  'style.css',
  'data.js',
  'app.js',
  'manifest.json',
  'icon.svg',
  'icon-maskable.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_VERSION).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((hit) => {
      if (hit) {
        // Refresh in the background so the next load gets any new deploy.
        event.waitUntil(fetch(event.request)
          .then((res) => res.ok && caches.open(CACHE_VERSION).then((c) => c.put(event.request, res)))
          .catch(() => {}));
        return hit;
      }
      return fetch(event.request).catch(() => caches.match('index.html'));
    }),
  );
});
