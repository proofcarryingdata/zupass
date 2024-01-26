import { SERVICE_WORKER_ENABLED } from "./sharedConstants";

/**
 * Installs a service worker which caches application code and
 * various artifacts needed by the application, so that the website
 * works offline, and so that it loads fast.
 *
 * The service worker is invalidated each time there is a production
 * deploy.
 *
 * The service worker is not installed in development mode, so that
 * its caching of application code does not interfere with quick
 * iteration loops.
 */
export async function registerServiceWorker(): Promise<void> {
  if (!("serviceWorker" in navigator)) {
    console.log(`[SERVICE_WORKER] service workers not supported`);
    return;
  }

  if (!SERVICE_WORKER_ENABLED) {
    console.log(
      `[SERVICE_WORKER] not registering service worker in development mode`
    );
    return;
  }

  const serviceWorkerPath = "/service-worker.js";

  console.log(`[SERVICE_WORKER] attempting to register ${serviceWorkerPath}`);

  try {
    await navigator.serviceWorker.register(serviceWorkerPath, {
      scope: "/"
    });

    console.log(`[SERVICE_WORKER] registered ${serviceWorkerPath}`);
  } catch (e) {
    console.log(
      `[SERVICE_WORKER] error registering service worker ${serviceWorkerPath}`,
      e
    );
  }
}
