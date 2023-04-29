// this file is loaded as a service worker

async function addResourcesToCache(resources: string[]): Promise<void> {
  const cache = await caches.open("v1");
  await cache.addAll(resources);
}

self.addEventListener("install", (event: any) => {
  console.log("[SERVICE_WORKER] installing");
  (self as any).skipWaiting();

  event.waitUntil(
    addResourcesToCache([
      "/",
      "/favicon.ico",
      "/index.html",
      "/global.css",
      "/js/index.js",
      "/semaphore-artifacts/16.wasm",
      "/semaphore-artifacts/16.zkey",
      "/fonts/IBMPlexSans-Regular.ttf",
      "/fonts/IBMPlexSans-Medium.ttf",
      "/fonts/IBMPlexSans-Light.ttf",
    ])
  );

  console.log("[SERVICE_WORKER] installed");
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
  console.log("[SERVICE_WORKER] activated");
});
