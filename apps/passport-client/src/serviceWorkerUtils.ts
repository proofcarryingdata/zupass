export async function registerServiceWorker() {
  const serviceWorkerPath = "/service-worker.js";

  console.log(`[SERVICE_WORKER] attempting to register ${serviceWorkerPath}`);

  if (!("serviceWorker" in navigator)) {
    console.log(`[SERVICE_WORKER] service workers not supported`);
    return;
  }

  try {
    await navigator.serviceWorker.register(serviceWorkerPath, {
      scope: "/",
    });

    console.log(`[SERVICE_WORKER] registered ${serviceWorkerPath}`);
  } catch (e) {
    console.log(
      `[SERVICE_WORKER] error registering service worker ${serviceWorkerPath}`,
      e
    );
  }
}
