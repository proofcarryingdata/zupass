// this file is loaded as a service worker
import { setTimeout as promiseTimeout } from "isomorphic-timers-promises";
import { SERVICE_WORKER_ENABLED } from "../sharedConstants";

// Hack to make TypeScript aware of the ServiceWorkerGlobalScope type.
// We can't redeclare `self`, but `swSelf` can be used with the right type.
const swSelf = self as unknown as ServiceWorkerGlobalScope;

/**
 * Unique ID set each time the server is built or deployed.  The build
 * process sets this by string replacement, so using it here also ensures
 * this file changes on every deploy, causing the service worker to update,
 * and changing the ephemeral cache name below.
 */
const SW_BUILD_ID = process.env.SW_ID;

/**
 * Time to wait for fetching items before checking in the ephemeral cache.
 */
const FETCH_TIMEOUT_MS = 5000;

/**
 * Common string identifying the stable and ephemeral caches as related.
 * This should change if we fundamentally change our caching approach, and
 * want to ensure even the stable cache is discarded.
 */
const CACHE_VERSION = "v2";

/**
 * The `GENERATED_CHUNKS` is a placeholder that is replaced during the build process
 * (via esbuild) with an array of URLs representing the files to be cached.
 * These will be included in the EPHMERAL_CACHE_RESOURCES set below.
 */
const GENERATED_CHUNKS: string[] = JSON.parse(
  process.env.GENERATED_CHUNKS || "[]"
);

/**
 * Ephemeral cache is for resources which may change frequently, where we
 * want to optimize for freshness, but allow caching for offline.  This cache
 * is also updated dynamically as resources are fetched, including for any
 * web resources (from passport-client) we might've missed when defining cache
 * configuration.
 * Cache name includes deployed code version, which protects against using
 * cached pages which came from a different server deploy.
 */
const EPHEMERAL_CACHE_NAME = `${CACHE_VERSION}-${SW_BUILD_ID}`;
const EPHEMERAL_CACHE_RESOURCES = new Set([
  "/",
  "/index.html",
  "/global-zupass.css",
  "/js/index.js",
  ...GENERATED_CHUNKS
]);

/**
 * Stable cache is for resources which are expected not to change frequently,
 * where we want to optimize for speed and limit bandwidth at the cost of
 * freshness.  This cache never has additional resources added.
 * These resources are updated only once after a new service worker is
 * installed.  That update isn't guaranteed to succeed, and won't be retried
 * if there's already a cached item.  Thus this list shouldn't contain anything
 * which could cause compatibility problems if it isn't refreshed.  If any of
 * these artifacts do need to be updated, they should be assigned a different
 * path, or removed from this list.
 */
const STABLE_CACHE_NAME = `${CACHE_VERSION}-stable`;
const STABLE_CACHE_RESOURCES = new Set([
  "/favicon.ico",
  "/semaphore-artifacts/16.wasm",
  "/semaphore-artifacts/16.zkey",
  "/artifacts/zk-eddsa-event-ticket-pcd/circuit.wasm",
  "/artifacts/zk-eddsa-event-ticket-pcd/circuit.zkey",
  "/fonts/Barlow-ExtraLight.ttf",
  "/fonts/Barlow-Light.ttf",
  "/fonts/Barlow-LightItalic.ttf",
  "/fonts/Barlow-Regular.ttf",
  "/fonts/Barlow-Medium.ttf",
  "/fonts/Barlow-SemiBold.ttf",
  "/fonts/Barlow-Bold.ttf",
  "/fonts/Barlow-ExtraBold.ttf",
  "/fonts/IBMPlexSans-ExtraLight.woff",
  "/fonts/IBMPlexSans-Light.woff",
  "/fonts/IBMPlexSans-LightItalic.woff",
  "/fonts/IBMPlexSans-Regular.woff",
  "/fonts/IBMPlexSans-Medium.woff",
  "/fonts/IBMPlexSans-SemiBold.woff",
  "/fonts/SuperFunky.ttf",
  "/fonts/PressStart2P.ttf",
  "/images/frogs/pixel_frog.png",
  "/images/afra.webp",
  "/images/arjun.webp",
  "/images/cold.webp",
  "/images/egg.webp",
  "/images/elephant.webp",
  "/images/hat.webp",
  "/images/johnwick.webp",
  "/images/owl.webp",
  "/images/plus.webp",
  "/images/sauna.webp",
  "/images/social.webp",
  "/images/star.webp",
  "/images/wristband.webp",
  "/zxcvbn.js",
  "fonts/Rubik-Black.ttf",
  "fonts/Rubik-BlackItalic.ttf",
  "fonts/Rubik-Bold.ttf",
  "fonts/Rubik-BoldItalic.ttf",
  "fonts/Rubik-ExtraBold.ttf",
  "fonts/Rubik-ExtraBoldItalic.ttf",
  "fonts/Rubik-Italic.ttf",
  "fonts/Rubik-Light.ttf",
  "fonts/Rubik-LightItalic.ttf",
  "fonts/Rubik-Medium.ttf",
  "fonts/Rubik-MediumItalic.ttf",
  "fonts/Rubik-Regular.ttf",
  "fonts/Rubik-SemiBold.ttf",
  "fonts/Rubik-SemiBoldItalic.ttf"
]);

/**
 * Used to extract a key from a request, to compare it to the lists of
 * cache resources above.  This may need updating if the list above ever
 * includes more complex URLs, with parameters, or across domains.
 */
function requestToItemCacheKey(request: Request): string {
  return new URL(request.url).pathname;
}

function cacheNameForLog(cacheName: string): string {
  return cacheName.substring(0, 9);
}

/**
 * Helpers for quickly enabling or disabling verbose logging.
 */
const swLog = {
  tag: `[SERVICE_WORKER][${SW_BUILD_ID.substring(0, 4)}]`,
  I: function (msg: string): void {
    console.log(this.tag, msg);
  },
  V: function (msg: string): void {
    console.debug(this.tag, msg);
  }
};

/**
 * Install is the first event which occurs when a new or updated ServiceWorker
 * is registered.
 */
self.addEventListener("install", (event: ExtendableEvent) => {
  swLog.V(`installing ${SW_BUILD_ID}`);

  // By default, the browser will only let one version of our ServiceWorker
  // be active, and will wait to activate a new one until the old one isn't
  // controlling any pages.  This call skips that so the new one can take
  // over ASAP.
  // We want to do this even if the service worker is meant to be disabled,
  // so that the disabled worker can take over from a stale enabled one.
  event.waitUntil(swSelf.skipWaiting());

  // Skip real service worker init if disabled.
  if (!SERVICE_WORKER_ENABLED) {
    swLog.V(`skipping installation when disabled ${SW_BUILD_ID}`);
    return;
  }

  event.waitUntil(
    (async (): Promise<void> => {
      // Pre-populate our cache with all the resources to operate offline.
      await prePopulateCaches();

      swLog.I(`installed ${SW_BUILD_ID}`);
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
    swLog.I(
      `service worker disabled: self-unregistering and refreshing client 
      windows ${SW_BUILD_ID}`
    );
    event.waitUntil(
      (async (): Promise<void> => {
        await swSelf.clients.claim();
        await swSelf.registration.unregister();
        for (const client of await swSelf.clients.matchAll()) {
          (client as WindowClient).navigate(client.url);
        }
      })()
    );
    return;
  }

  swLog.V(`activating ${SW_BUILD_ID}`);

  event.waitUntil(
    (async (): Promise<void> => {
      // If supported, NavigationPreload allows fetches to start in parallel to
      // the running of our fetch event handler, as well as the bootup time of
      // an idle service-worker.  It's worth enabling to reduce latency.
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

      swLog.I(`activated ${SW_BUILD_ID}`);
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
  event.respondWith(
    (async (): Promise<Response> => {
      // Check stable cache first.  If we get a hit, we never fetch.
      const stableResp = await checkStableCache(event.request);
      if (stableResp) {
        swLog.V(`cache hit fetching ${event.request?.url}`);
        return stableResp;
      }

      // Check ephemeral cache next.  We'll only use this if the network
      // request fails or times out, but fetching it first is safer
      // than racing against an update of the same entry.
      // TODO(artwyman): Investigate how the cache works and whether this is
      // really necessary or safe.
      const cacheResp = await checkEphemeralCache(event.request);

      // Next setup a network fetch to run asynchronously, along with a timeout.
      // We're not awaiting either promise yet, so shouldn't get exceptions.
      const timeoutPromise = startFetchTimeout();
      const respPromise = startFetch(event);

      try {
        // Wait for fetch to complete or timeout to expire.  Failure and
        // expiration both result in exceptions, so if we get a result
        // at all we can simply return it.
        return await Promise.race([respPromise, timeoutPromise]);
      } catch (error: unknown) {
        // If stable cache and network both failed, use ephemeral cache, but
        // still make sure the event waits for the fetch to finish and update
        // the cachee.
        if (cacheResp) {
          swLog.V(`cache fallback for ${event.request?.url} after ${error}`);
          event.waitUntil(respPromise);
          return cacheResp;
        } else {
          swLog.V(`no fallback for ${event.request?.url} after ${error}`);
        }

        // If we have no cached entry available, we have no choice but to wait
        // for the fetch to complete, or to fail and throw an exeption.
        // This could be the same exception we already caught, which is fine.
        return await respPromise;
      }
    })()
  );
});

/**
 * Sets up a promise which will throw after a timeout expires.  The promise
 * is never fulfilled, only rejected.  The timeout is configured based on
 * the expected network conditions.
 */
async function startFetchTimeout(): Promise<Response> {
  // The onLine flag is said to be reliable when false, but not when
  // true.  So if we expect to be offline use a short timeout rather
  // than waiting for a fetch which could be slow.  1ms gives the
  // fetch a chance to fail fast in an informative way.
  const timeoutMS = navigator.onLine ? FETCH_TIMEOUT_MS : 1;
  await promiseTimeout(timeoutMS);
  throw `fetch ${navigator.onLine ? "timed out" : "offline"}`;
}

/**
 * Performs a network fetch (using preload if available) and updates
 * the ephemeral cache with the result.  This function always waits
 * for the fetch to finish, and doesn't include any fallback strategies.
 */
async function startFetch(event: FetchEvent): Promise<Response> {
  try {
    let resp = await event.preloadResponse;
    if (resp) {
      swLog.V(`preload response fetching ${event.request?.url}`);
    } else {
      resp = await fetch(event.request);
      swLog.V(`network response fetching ${event.request?.url}`);
    }

    // Update caches if appropriate.
    // The stable cache update should only happen if pre-populating failed at
    // install time, or the cache was cleared by the user, causing a cache miss.
    // The ephemeral cache update happens after every network fetch.
    // Note that Response can be read only once, so needs to be cloned
    // (synchronously) to be added to cache.  This lets the orignal still be
    // readable when returned.
    // We're explicitly awaiting the cache update here rather than letting it
    // run asynchronously.  This ensures we wait for the full download, not
    // just the initial response headers.  That means the timeout can still
    // trigger while we're waiting for the download.
    if (shouldUpdateStableCache(event.request, resp)) {
      await updateCache(STABLE_CACHE_NAME, event.request, resp.clone());
    } else if (shouldUpdateEphemeralCache(event.request, resp)) {
      await updateCache(EPHEMERAL_CACHE_NAME, event.request, resp.clone());
    }

    // Cache has been updated if relevant, so we return the response, which
    // should be ready to be read in its entirety.  For uncached resources,
    // this is just the ordinary response, not yet fully downloaded.
    // TODO(artwyman): Is it safer to return the original response here, or to
    // read from the now-updated cache?  Where does the body of the large
    // response stream get stored when read twice?
    swLog.V(`fetch response completed for ${event.request?.url}`);
    return resp;
  } catch (error) {
    swLog.V(`failed to fetch ${event.request?.url}: ${error}`);
    throw error;
  }
}

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
      if (!STABLE_CACHE_RESOURCES.has(urlKey)) {
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
  resources: Set<string>
): Promise<void> {
  const cache = await caches.open(cacheName);
  for (const resource of resources) {
    try {
      await cache.add(resource);
      swLog.V(`Cache ${cacheNameForLog(cacheName)} pre-cached ${resource}`);
    } catch (error) {
      swLog.V(
        `Cache ${cacheNameForLog(
          cacheName
        )} failed to pre-cache ${resource}: ${error}`
      );
    }
  }
}

async function checkStableCache(
  request: Request
): Promise<Response | undefined> {
  if (shouldCheckStableCache(request)) {
    return await fetchFromCache(STABLE_CACHE_NAME, request);
  }
  return undefined;
}

async function checkEphemeralCache(
  request: Request
): Promise<Response | undefined> {
  return await fetchFromCache(EPHEMERAL_CACHE_NAME, request);
}

function shouldHandleFetch(request: Request): boolean {
  // This limits the scope of service worker caching to only web resources
  // (i.e. passport-client not passport-server).
  return (
    SERVICE_WORKER_ENABLED &&
    request.method === "GET" &&
    swSelf.location.origin === new URL(request.url).origin
  );
}

function shouldUpdateStableCache(
  request: Request,
  response: Response
): boolean {
  // shouldHandleFetch has already qualified the requests we want to cache, and
  // we'd never fetch if we had a stable cache hit.  But on a cache miss which
  // we successfully fetch, we want to add the missing entry if it's in our list
  // of stable resources.
  return (
    response.ok && STABLE_CACHE_RESOURCES.has(requestToItemCacheKey(request))
  );
}

function shouldUpdateEphemeralCache(
  request: Request,
  response: Response
): boolean {
  // shouldHandleFetch has already qualified the requests we want to cache, but
  // we want to update the cache only on success.
  return response.ok;
}

function shouldCheckStableCache(request: Request): boolean {
  // shouldHandleFetch has already qualified the requests we want to cache, so
  // here we only need to limit it to the specific stable resources.
  return STABLE_CACHE_RESOURCES.has(requestToItemCacheKey(request));
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
  swLog.V(`Cache ${cacheNameForLog(cacheName)} updating ${request.url}`);
  const cache = await caches.open(cacheName);
  await cache.put(request, response);
}
