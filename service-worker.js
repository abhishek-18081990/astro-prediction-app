const cacheName = 'jyotish-cache-v1';
const staticAssets = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

self.addEventListener('install', async event => {
  const cache = await caches.open(cacheName);
  await cache.addAll(staticAssets);
  return self.skipWaiting();
});

self.addEventListener('activate', event => {
  self.clients.claim();
});

self.addEventListener('fetch', async event => {
  const req = event.request;
  const cachedResponse = await caches.match(req);
  return cachedResponse || fetch(req);
});
