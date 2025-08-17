// ShopVerse Service Worker
// Provides offline support with cached assets and fallback page

const CACHE_NAME = "shopverse-cache-v1";
const OFFLINE_PAGE = "/offline.html";

// Import Workbox (Google's library for PWA caching strategies)
importScripts("https://storage.googleapis.com/workbox-cdn/releases/5.1.2/workbox-sw.js");

// Immediately activate new service worker when updated
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

// Install offline page
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        OFFLINE_PAGE,
        "/index.html",
        "/icon-192.png",
        "/icon-512.png"
      ]);
    })
  );
});

// Enable navigation preload if available
if (workbox.navigationPreload.isSupported()) {
  workbox.navigationPreload.enable();
}

// Cache strategies
workbox.routing.registerRoute(
  new RegExp("/.*"),
  new workbox.strategies.StaleWhileRevalidate({
    cacheName: CACHE_NAME,
  })
);

// Offline fallback
self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const preloadResp = await event.preloadResponse;
          if (preloadResp) return preloadResp;

          const networkResp = await fetch(event.request);
          return networkResp;
        } catch (error) {
          const cache = await caches.open(CACHE_NAME);
          const cachedResp = await cache.match(OFFLINE_PAGE);
          return cachedResp;
        }
      })()
    );
  }
});