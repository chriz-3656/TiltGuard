const CACHE_NAME = "tiltguard-v7";

const CORE_ASSETS = [
  "/",
  "/index.html",
  "/settings.html",
  "/style.css",
  "/script.js",
  "/settings.js",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

const MODEL_ASSETS = [
  "/models/tiny_face_detector_model-weights_manifest.json",
  "/models/tiny_face_detector_model-shard1",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(CORE_ASSETS);

      // Cache model files opportunistically if they exist.
      await Promise.allSettled(
        MODEL_ASSETS.map(async (asset) => {
          const response = await fetch(asset);
          if (response.ok) {
            await cache.put(asset, response.clone());
          }
        })
      );

      self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
          return Promise.resolve();
        })
      );
      self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    (async () => {
      if (event.request.mode === "navigate") {
        try {
          const navigationResponse = await fetch(event.request);
          if (navigationResponse && navigationResponse.ok) {
            return navigationResponse;
          }
        } catch (error) {
          // Fall through to app shell fallback.
        }

        const shell = (await caches.match("/")) || (await caches.match("/index.html"));
        return shell || Response.error();
      }

      const cached = await caches.match(event.request);
      if (cached) {
        return cached;
      }

      try {
        const networkResponse = await fetch(event.request);

        if (
          networkResponse &&
          networkResponse.status === 200 &&
          event.request.url.startsWith(self.location.origin)
        ) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, networkResponse.clone());
        }

        return networkResponse;
      } catch (error) {
        const fallback = await caches.match("/index.html");
        return fallback || Response.error();
      }
    })()
  );
});
