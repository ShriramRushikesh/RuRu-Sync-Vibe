// v2 — bumped to force-clear old cache that had stale index.html with wrong asset hashes
const CACHE_NAME = 'ruru-cache-v2';

// NOTE: Do NOT cache index.html — it embeds hashed asset URLs that change on every build
const PRECACHE_ASSETS = [
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
  // Immediately activate — don't wait for old SW to die
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Never cache index.html — always fetch fresh from network
  if (url.pathname === '/' || url.pathname === '/index.html') {
    event.respondWith(fetch(event.request));
    return;
  }

  // Cache-first for hashed static assets (JS, CSS) — safe because hash changes on every build
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        const response = await fetch(event.request);
        if (response.ok) cache.put(event.request, response.clone());
        return response;
      })
    );
    return;
  }

  // Network-first for everything else (API calls, socket)
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
