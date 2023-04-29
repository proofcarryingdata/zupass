export async function registerServiceWorker() {
  if (!("serviceworker" in navigator)) {
    return;
  }
  const serviceWorkerPath = "/js/src/service-worker.js";

  try {
    await navigator.serviceWorker.register(serviceWorkerPath, {
      scope: "/*",
    });
    console.log(`[SERVICE_WORKER] registered ${serviceWorkerPath}`);
  } catch (e) {
    console.log(
      `[SERVICE_WORKER] error registering service worker ${serviceWorkerPath}`,
      e
    );
  }
}
