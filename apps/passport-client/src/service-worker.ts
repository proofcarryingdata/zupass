// this file is loaded as a service worker

// Hack to make TypeScript aware of the ServiceWorkerGlobalScope type.
// We can't redeclare `self`, but `swSelf` can be used with the right type.
/// <reference lib="webworker" />
const swSelf = self as unknown as ServiceWorkerGlobalScope;

// Global flag to enable or disable service worker quickly.
export const SERVICE_WORKER_ENABLED =
  true || process.env.NODE_ENV !== "development"; // TODO(artwyman): cleanup before checkin

/**
 * Ephemeral cache is for resources which may change frequently, where we
 * want to optimize for freshness, but allow caching for offline.  This cache
 * is also updated dynamically as resources are fetched.  Cache name includes
 * deployed code version, which protects against using
 * cached pages which came from a different server deploy.
 */
const EPHEMERAL_CACHE_NAME = `v1-${process.env.SW_ID}`;
const EPHEMERAL_CACHE_RESOURCES = [
  "/",
  "/index.html",
  "/global-zupass.css",
  "/js/index.js"
];

/**
 * Stable cache is for resources which are expected not to change frequently,
 * where we want to optimize for speed and limit bandwidth at the cost of
 * freshness.  This cache never has additional resources added.
 * These resources are updated only when a new service worker is installed.
 * since htat update isn't guaranteed to succeed, this list shouldn't contain
 * anything which could cause compatibility problems if it isn't updated.
 */
const STABLE_CACHE_NAME = "v1-stable";
const STABLE_CACHE_RESOURCES = [
  "/favicon.ico",
  "/semaphore-artifacts/16.wasm",
  "/semaphore-artifacts/16.zkey",
  "/artifacts/zk-eddsa-event-ticket-pcd/circuit.wasm",
  "/artifacts/zk-eddsa-event-ticket-pcd/circuit.zkey",
  "/fonts/IBMPlexSans-Regular.ttf",
  "/fonts/IBMPlexSans-Medium.ttf",
  "/fonts/IBMPlexSans-Light.ttf",
  "/fonts/IBMPlexSans-ExtraLight.ttf",
  "/fonts/IBMPlexSans-Regular.woff",
  "/fonts/IBMPlexSans-Medium.woff",
  "/fonts/IBMPlexSans-Light.woff",
  "/fonts/IBMPlexSans-ExtraLight.woff"
];

/**
 * Used to extract a key from a request, to compare it to the lists of
 * cache resources above.  This may need updating if the list above ever
 * includes more complex URLs, with parameters, or across domains.
 */
function requestToItemCacheKey(request: Request): string {
  return new URL(request.url).pathname;
}

function logCacheName(cacheName: string): string {
  return cacheName.substring(0, 9);
}

/**
 * Helpers for quickly enabling or disabling verbose logging.
 */
const swLog = {
  verbose: true, // TODO(artwyman): Disable before merging.
  tag: `[SERVICE_WORKER][${process.env.SW_ID.substring(0, 4)}]`,
  I: function (msg: string) {
    console.log(this.tag, msg);
  },
  V: function (msg: string) {
    if (this.verbose) {
      console.debug(this.tag, msg);
    }
  }
};

/**
 * Install is the first event which occurs when a new or updated ServiceWorker
 * is registered.
 */
self.addEventListener("install", (event: ExtendableEvent) => {
  swLog.V(`installing ${process.env.SW_ID}`);

  if (!SERVICE_WORKER_ENABLED) {
    return;
  }

  event.waitUntil(
    (async () => {
      // By default, the browser will only let one version of our ServiceWorker
      // be active, and will wait to activate a new one until the old one isn't
      // controlling any pages.  This call skips that so the new one can take
      // over ASAP.
      await swSelf.skipWaiting();

      // Pre-populate our cache with all the resources we need to operate offline.
      await prePopulateCaches();

      swLog.I(`installed ${process.env.SW_ID}`);
    })()
  );
});

/**
 * Activate happens after install, when the ServiceWorker is ready to take
 * control of clients.
 */
self.addEventListener("activate", (event: ExtendableEvent) => {
  // Clean up any stray service workers from prior development.
  if (!SERVICE_WORKER_ENABLED) {
    swLog.I(`self-unregistering`);
    event.waitUntil(
      (async () => {
        await swSelf.registration.unregister();
        for (const client of await swSelf.clients.matchAll()) {
          (client as WindowClient).navigate(client.url);
        }
      })()
    );
    return;
  }

  swLog.V(`activating ${process.env.SW_ID}`);

  event.waitUntil(
    (async () => {
      // If supported, NavigationPreload allows fetches to start in
      // parallel to the running of our fetch event handler.
      if (swSelf.registration.navigationPreload) {
        swLog.V(`navigation preload enabled`);
        await swSelf.registration.navigationPreload.enable();
      }

      // If cache name has changed, delete any old caches which may exist.
      await deleteOldCaches();

      // By default, client windows won't be associated with a ServiceWorker
      // which wasn't already active when they loaded.  This call bypasses that
      // letting us take over any existing windows.
      await swSelf.clients.claim();

      swLog.I(`activated ${process.env.SW_ID}`);
    })()
  );
});

/**
 * Fetch is where the service worker gets to decide what happens to network
 * requests.  It handles all fetches from controlled pages, even if they're
 * not within the service worker's origin.
 */
self.addEventListener("fetch", (event: FetchEvent) => {
  if (!shouldHandleFetch(event.request)) {
    swLog.V(`ignoring fetch ${event.request?.url}`);
    return;
  }

  swLog.V(`fetching ${event.request?.url}`);

  //TODO(artwyman): Investigate what respondWidth(undefined) does.

  event.respondWith(
    (async () => {
      // Check stable cache first.  If we get a hit, we never fetch.
      const stableResp = await fetchFromCache(STABLE_CACHE_NAME, event.request);
      if (stableResp) {
        swLog.V(`cache hit fetching ${event.request?.url}`);
        return stableResp;
      }

      // Next go to the network, and update ephemeral cache with the results.
      // We only try to look up a result in ephemeral cache when network fails.
      try {
        // TODO(artwyman): Add a timeout so we can fall back to cache when slow.
        // TODO(artwyman): check navigator.onLine to fall back faster.  Docs
        // suggest it's reliable when false.
        let resp: Response | undefined = await event.preloadResponse;
        if (resp) {
          swLog.V(`preload response fetching ${event.request?.url}`);
        } else {
          resp = await fetch(event.request);
          swLog.V(`network response fetching ${event.request?.url}`);
        }

        // Response can be read only once, so needs to be cloned to be added
        // to cache, which happens asynchronously after we return a response.
        event.waitUntil(
          updateCache(EPHEMERAL_CACHE_NAME, event.request, resp.clone())
        );

        // Deliver successful response from network.
        return resp;
      } catch (error: any) {
        swLog.V(`failed to fetch ${event.request?.url}: ${error}`);

        // If stable cache and network both failed, respond from ephemeral
        // cache, if possible.
        const cacheResp = await fetchFromCache(
          EPHEMERAL_CACHE_NAME,
          event.request
        );
        if (cacheResp) {
          swLog.V(`cache fallback ${event.request?.url}`);
          return cacheResp;
        }

        // If we have no cached entry available, fail with the fetch's error.
        throw error;
      }
    })()
  );
});

/**
 * Cache setup which occurs during installation.
 */
async function prePopulateCaches(): Promise<void> {
  await addResourcesToCache(STABLE_CACHE_NAME, STABLE_CACHE_RESOURCES);
  await addResourcesToCache(EPHEMERAL_CACHE_NAME, EPHEMERAL_CACHE_RESOURCES);
}

/**
 * Cache cleanup which occurs on activation.
 */
async function deleteOldCaches(): Promise<void> {
  // Delete old caches that don't match the current version.
  for (const cacheName of await caches.keys()) {
    if (cacheName !== STABLE_CACHE_NAME && cacheName !== EPHEMERAL_CACHE_NAME) {
      swLog.I(`Deleting unknown cache version: ${cacheName}`);
      await caches.delete(cacheName);
    }
  }

  // Delete all existing cache entries not in our "permanent" list.
  // This eliminates any stale entries from old service workers which
  // used a different list.
  const stableCache = await caches.open(STABLE_CACHE_NAME);
  const keys = await stableCache.keys();
  await Promise.all(
    keys.map(async (request: Request) => {
      const urlKey = requestToItemCacheKey(request);
      if (!STABLE_CACHE_RESOURCES.includes(urlKey)) {
        swLog.I(`${STABLE_CACHE_NAME} discarding ${urlKey}`);
        await stableCache.delete(request);
      } else {
        swLog.V(`${STABLE_CACHE_NAME} keeping ${urlKey}`);
      }
    })
  );
}

async function addResourcesToCache(
  cacheName: string,
  resources: string[]
): Promise<void> {
  const cache = await caches.open(cacheName);
  for (const resource of resources) {
    try {
      await cache.add(resource);
      swLog.V(`Cache ${logCacheName(cacheName)} pre-cached ${resource}`);
    } catch (error) {
      swLog.V(
        `Cache ${logCacheName(
          cacheName
        )} failed to pre-cache ${resource}: ${error}`
      );
    }
  }
}

function shouldHandleFetch(request: Request): boolean {
  return (
    SERVICE_WORKER_ENABLED &&
    request.method === "GET" &&
    swSelf.location.origin === new URL(request.url).origin
  );
}

function shouldCache(request: Request, response: Response): boolean {
  return response.ok && shouldHandleFetch(request);
}

async function fetchFromCache(
  cacheName: string,
  request: Request
): Promise<Response | undefined> {
  const cache = await caches.open(cacheName);
  return cache.match(request);
}

async function updateCache(
  cacheName: string,
  request: Request,
  response: Response
): Promise<void> {
  if (shouldCache(request, response)) {
    swLog.V(
      `Cache ${logCacheName(cacheName)} Updating cache for ${request.url}`
    );
    const cache = await caches.open(cacheName);
    await cache.put(request, response);
  }
}
