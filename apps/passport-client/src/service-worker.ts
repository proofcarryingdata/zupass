// this file is loaded as a service worker

/**
 * These files are cleared from the cache every time a new version
 * of the service worker is installed, because a new version of
 * the service worker is triggered by a change in the service worker
 * source code, which happens each time production deploys.
 */
const impermanentCache = [
  "/",
  "/index.html",
  "/global-pcdpass.css",
  "/global-zupass.css",
  "/js/index.js",
];

async function addResourcesToCache(resources: string[]): Promise<void> {
  const cache = await caches.open("v1");

  await Promise.all(impermanentCache.map((item) => cache.delete(item)));

  await cache.addAll(resources);
}

self.addEventListener("install", (event: any) => {
  console.log(`[SERVICE_WORKER] installing ${process.env.SW_ID}`);
  (self as any).skipWaiting();

  event.waitUntil(
    addResourcesToCache([
      ...impermanentCache,
      "/favicon.ico",
      "/semaphore-artifacts/16.wasm",
      "/semaphore-artifacts/16.zkey",
      "/fonts/IBMPlexSans-Regular.ttf",
      "/fonts/IBMPlexSans-Medium.ttf",
      "/fonts/IBMPlexSans-Light.ttf",
    ])
  );

  console.log(`[SERVICE_WORKER] installed ${process.env.SW_ID}`);
});

async function cacheFirst(request): Promise<Response> {
  const responseFromCache = await caches.match(request);

  if (responseFromCache) {
    console.log("[SERVICE_WORKER] cache hit ", request?.url);
    return responseFromCache;
  } else {
    console.log("[SERVICE_WORKER] cache miss", request?.url);
    return fetch(request);
  }
}

self.addEventListener("fetch", (event: any) => {
  event.respondWith(cacheFirst(event.request));
});

self.addEventListener("activate", () => {
  console.log(`[SERVICE_WORKER] activated ${process.env.SW_ID}`);
});
