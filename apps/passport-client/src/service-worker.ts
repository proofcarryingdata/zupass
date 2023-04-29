// this file is loaded as a service worker

const addResourcesToCache = async (resources: string[]) => {
  const cache = await caches.open("v1");
  await cache.addAll(resources);
};

self.addEventListener("install", (event: any) => {
  event.waitUntil(
    addResourcesToCache([
      "/",
      "/index.html",
      "/global.css",
      "/js/index.js",
      "/image-list.js",
    ])
  );
});
