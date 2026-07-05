/* eslint-disable no-restricted-globals */

const CACHE_NAME = "webauthn-poc-v1";

// Install event
self.addEventListener("install", () => {
  self.skipWaiting();
});

// Activate event — clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

// Fetch event — network-first strategy
self.addEventListener("fetch", (event) => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
