const CACHE_NAME = 'graocert-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.warn('Silent issue caching some files on install:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Let browser make standard request first, fall back to cache if offline
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache new successful dynamic assets if they are standard GET requests
        if (response.status === 200 && event.request.method === 'GET' && !event.request.url.startsWith('chrome-extension')) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Default fallbacks for common routes if offline and missing from cache
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
          return new Response('Sem conexão à internet no campo.', {
            status: 503,
            statusText: 'Serviço Indisponível'
          });
        });
      })
  );
});
