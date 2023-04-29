// this file is loaded as a service worker

const addResourcesToCache = async (resources: string[]) => {
  const cache = await caches.open("v1");
  await cache.addAll(resources);
};

const cacheFirst = async (request) => {
  const responseFromCache = await caches.match(request);
  if (responseFromCache) {
    return responseFromCache;
  }
  return fetch(request);
};

self.addEventListener("fetch", (event: any) => {
  event.respondWith(cacheFirst(event.request));
});

self.addEventListener("install", (event: any) => {
  event.waitUntil(
    addResourcesToCache([
      "/",
      "/index.html",
      "/global.css",
      "/js/index.js",
      "/semaphore-artifacts/16.wasm",
      "/semaphore-artifacts/16.zkey",
    ])
  );
});
