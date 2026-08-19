/* Offline shell for Hungarian Lingo.
 *
 * Everything the app needs is static, so the cache holds the whole app.
 * Bump CACHE_VERSION on any release to retire the old files.
 */

const CACHE_VERSION = 'hl-v10';

const ASSETS = [
  '.',
  'index.html',
  'style.css',
  'data.js',
  'harmony.js',
  'profile.js',
  'speech.js',
  'app.js',
  'manifest.json',
  'icon.svg',
  'icon-maskable.svg',
  /* Small, and needed before the first clip can be found at all. The clips
   * themselves are not precached — see below. */
  'audio/manifest.json',
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
      /* Audio clips are cached on first play rather than precached on install:
       * the catalogue is ~460 KB and most learners will never touch every
       * question, so paying for it up front on a phone is the wrong trade.
       * Once heard, a clip is offline for good. */
      if (/\/audio\/.*\.opus$/.test(new URL(event.request.url).pathname)) {
        return fetch(event.request)
          .then((res) => {
            if (res.ok) {
              const copy = res.clone();
              event.waitUntil(caches.open(CACHE_VERSION).then((c) => c.put(event.request, copy)));
            }
            return res;
          })
          /* No network and never played before — the app falls back to the
           * device voice on its own, so failing here is safe. */
          .catch(() => Response.error());
      }
      return fetch(event.request).catch(() => caches.match('index.html'));
    }),
  );
});
