// Offline support: keep the app shell cached so the iPad works without internet.
// Asset names are hashed per build, so they are discovered from index.html at install
// time and otherwise cached as they are fetched.
// ponytail: old hashed assets are never evicted; they are a few hundred KB per release.

const CACHE = 'pub22';

self.addEventListener('install', (event) => {
  event.waitUntil(precache());
  self.skipWaiting();
});

self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

async function precache() {
  const cache = await caches.open(CACHE);
  const page = await fetch('./', { cache: 'no-cache' });
  const html = await page.clone().text();
  await cache.put('./', page);
  const assets = [...html.matchAll(/(?:src|href)="(\.\/[^"]+)"/g)].map((m) => m[1]);
  await cache.addAll(assets);
}

// Pages: network first (so updates arrive), cached copy when offline or slow.
async function page(request) {
  const cache = await caches.open(CACHE);
  try {
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000));
    const response = await Promise.race([fetch(request), timeout]);
    if (response.ok) cache.put('./', response.clone());
    return response;
  } catch {
    return (await cache.match('./', { ignoreVary: true })) ?? Response.error();
  }
}

// Everything else: cache first, fetched and stored on a miss.
async function asset(request) {
  const cache = await caches.open(CACHE);
  // ignoreVary: module scripts are requested with an Origin header the precache request lacked.
  const hit = await cache.match(request, { ignoreVary: true });
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== location.origin) return;
  event.respondWith(request.mode === 'navigate' ? page(request) : asset(request));
});
