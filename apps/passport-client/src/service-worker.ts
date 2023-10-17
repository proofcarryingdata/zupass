// this file is loaded as a service worker

/**
 * These files are cleared from the cache every time a new version
 * of the service worker is installed, because a new version of
 * the service worker is triggered by a change in the service worker
 * source code, which happens each time production deploys.
 */
const impermanentCache = [
  // "/",
  // "/favicon.ico",
  // "/index.html",
  // "/global-zupass.css",
  // "/js/index.js"
];

const permanentCache = [
  "/semaphore-artifacts/16.wasm",
  "/semaphore-artifacts/16.zkey",
  "/artifacts/zk-eddsa-event-ticket-pcd/circuit.wasm",
  "/artifacts/zk-eddsa-event-ticket-pcd/circuit.zkey",
  "/fonts/IBMPlexSans-Regular.woff",
  "/fonts/IBMPlexSans-Medium.woff",
  "/fonts/IBMPlexSans-Light.woff",
  "/fonts/IBMPlexSans-ExtraLight.woff"
];

function requestToItemCacheKey(request: Request): string {
  // This may need updating if the list above ever includes more complex
  // URLs, with parameters, or across domains.
  return new URL(request.url).pathname;
}

async function addResourcesToCache(): Promise<void> {
  const cache = await caches.open("v1");

  const keys = await cache.keys();

  // Delete all existing cache entries not in our "permanent" list.
  // This eliminates any stale entries from old service workers which
  // used a different list.
  await Promise.all(
    keys.map((request: Request) => {
      if (!permanentCache.includes(requestToItemCacheKey(request))) {
        console.log(
          `[SERVICE_WORKER] discarding ${new URL(request.url).pathname}`
        );
        cache.delete(request);
      } else {
        console.log(
          `[SERVICE_WORKER] keeping ${new URL(request.url).pathname}`
        );
      }
    })
  );

  // Pre-populate the cache with the entries we want.
  await cache.addAll([...impermanentCache, ...permanentCache]);
}

self.addEventListener("install", (event: any) => {
  console.log(`[SERVICE_WORKER] installing ${process.env.SW_ID}`);
  (self as any).skipWaiting();

  event.waitUntil(addResourcesToCache());

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
