// Service Worker with safe update strategy:
// - network-first for navigation requests (index.html)
// - cache-first for other GET assets with background update
// - cleans old caches on activate
// - supports skipWaiting via message

const CACHE_NAME = 'forneiro-eden-v2';
const PRECACHE_URLS = ['/', '/index.html'];

self.addEventListener('install', (event) => {
  // Activate faster
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.map((key) => {
        if (key !== CACHE_NAME) return caches.delete(key);
        return Promise.resolve();
      })
    )).then(() => self.clients.claim())
  );
});

// Helper to determine navigation requests
const isNavigationRequest = (req) => {
  return req.mode === 'navigate' || (req.method === 'GET' && (req.headers.get('accept') || '').includes('text/html'));
};

// Helper to safely clone response
const safeCloneResponse = (response) => {
  if (!response || response.bodyUsed) {
    return null;
  }
  
  try {
    return response.clone();
  } catch (error) {
    console.warn('Cannot clone response:', error);
    return null;
  }
};

self.addEventListener('fetch', (event) => {
  const req = event.request;
  
  // Ignore non-GET requests and API calls
  if (req.method !== 'GET') return;
  
  // Skip caching for API requests
  if (req.url.includes('/api/')) {
    event.respondWith(fetch(req));
    return;
  }

  // For navigation (HTML) use network-first so users get latest index.html
  if (isNavigationRequest(req)) {
    event.respondWith(
      fetch(req)
        .then((networkResp) => {
          // Safely update cache
          const clonedResponse = safeCloneResponse(networkResp);
          if (clonedResponse) {
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clonedResponse));
          }
          return networkResp;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match('/')))
    );
    return;
  }

  // For other assets: try cache first, then network. If served from cache, update in background.
  event.respondWith(
    caches.match(req).then((cachedResp) => {
      // Return cached response if available
      if (cachedResp) {
        // Background update from network
        fetch(req)
          .then((networkResp) => {
            if (networkResp && networkResp.ok) {
              const clonedResponse = safeCloneResponse(networkResp);
              if (clonedResponse) {
                caches.open(CACHE_NAME).then((cache) => cache.put(req, clonedResponse));
              }
            }
          })
          .catch(() => {}); // Ignore network errors for background update
        return cachedResp;
      }

      // No cache found, fetch from network
      return fetch(req)
        .then((networkResp) => {
          if (networkResp && networkResp.ok) {
            const clonedResponse = safeCloneResponse(networkResp);
            if (clonedResponse) {
              caches.open(CACHE_NAME).then((cache) => cache.put(req, clonedResponse));
            }
          }
          return networkResp;
        })
        .catch(() => {
          // Network failed and no cache available
          return new Response('Network error', {
            status: 408,
            statusText: 'Network error'
          });
        });
    })
  );
});

// Allow the page to tell the SW to skipWaiting (used during deploy)
self.addEventListener('message', (event) => {
  if (!event.data) return;
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
