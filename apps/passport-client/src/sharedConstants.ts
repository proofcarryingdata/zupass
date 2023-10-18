/**
 * Single constant shared between the service worker and the page code which
 * registers it.
 */
export const SERVICE_WORKER_ENABLED = process.env.NODE_ENV !== "development";
