// Service worker with offline support, static asset caching, and cache cleanup

importScripts('https://storage.googleapis.com/workbox-cdn/releases/5.1.2/workbox-sw.js');

const CACHE = "pwabuilder-page-v1"; // Update version when assets change
const OFFLINE_FALLBACK_PAGE = "index.html";

// Skip waiting and activate immediately when requested
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Pre-cache fallback and static assets on install
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => {
      return cache.addAll([
        OFFLINE_FALLBACK_PAGE,
        "/styles.css",   // Replace with your CSS
        "/app.js",       // Replace with your JS
        "/logo.png",     // Replace with your logo
        "/favicon.ico",
      ]);
    })
  );
  self.skipWaiting(); // Optional: activate right after install
});

// Activate new service worker and clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE && cacheName.startsWith("pwabuilder-page")) {
            return caches.delete(cacheName);
          }
        })
      );
      await self.clients.claim();
    })()
  );
});

// Enable navigation preload for faster loading
if (workbox.navigationPreload.isSupported()) {
  workbox.navigationPreload.enable();
}

// Cache static assets with a cache-first strategy
workbox.routing.registerRoute(
  /\.(?:js|css|png|jpg|jpeg|svg|gif|ico)$/,
  new workbox.strategies.CacheFirst({
    cacheName: 'static-resources',
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      }),
    ],
  })
);

// Handle navigation requests with a network-first strategy
self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          // Use preload response if available
          const preloadResp = await event.preloadResponse;
          if (preloadResp) return preloadResp;

          // Try fetching from network
          const networkResp = await fetch(event.request);
          return networkResp;
        } catch (error) {
          // Fallback to cached offline page
          const cache = await caches.open(CACHE);
          return await cache.match(OFFLINE_FALLBACK_PAGE);
        }
      })()
    );
  }
});