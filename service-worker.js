const CACHE_NAME = "shopverse-cache-v2";
const FILES_TO_CACHE = [
  "/",
  "/index.html",
  "/style.css",
  "/script.js",
  "/manifest.json",

  // ✅ Product Images
  "/img/phone1.jpg",
  "/img/phone2.jpg",
  "/img/laptop1.jpg",
  "/img/sweater.jpg",
  "/img/watch.jpg",
  "/img/headphones1.jpg",

  // ✅ Add other static images
  "/img/icon/logo.png",
  "/img/icons/icon-192.png",
  "/img/icons/icon-512.png"
];

// Install Service Worker
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate Service Worker (remove old caches)
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// Fetch (Cache First Strategy)
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});