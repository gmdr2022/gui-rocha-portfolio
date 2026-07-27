const CACHE_NAME = "gui-rocha-v7";
const CORE_ASSETS = [
  "/",
  "/en/",
  "/es/",
  "/assets/css/styles.css",
  "/assets/js/site.js",
  "/assets/js/home.js",
  "/assets/js/about.js",
  "/assets/js/project.js",
  "/assets/js/contact.js",
  "/assets/img/gui-rocha.jpg",
  "/assets/img/brand/gr-mark-primary.svg",
  "/assets/img/brand/gui-rocha-compact-for-light.svg",
  "/assets/img/brand/gui-rocha-compact-for-dark.svg",
  "/assets/img/brand/guilherme-rocha-horizontal-for-light.svg",
  "/assets/img/brand/guilherme-rocha-horizontal-for-dark.svg",
  "/assets/img/brand/favicon-512.png",
  "/favicon.svg",
  "/manifest.webmanifest",
  "/en/manifest.webmanifest",
  "/es/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((names) => Promise.all(
    names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name)),
  )));
  self.clients.claim();
});

const localeFallback = (pathname) => {
  if (pathname === "/en" || pathname.startsWith("/en/")) return "/en/";
  if (pathname === "/es" || pathname.startsWith("/es/")) return "/es/";
  return "/";
};

const cacheResponse = async (request, response) => {
  if (response.ok) {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
  }
  return response;
};

const networkFirst = async (request) => {
  try {
    return await cacheResponse(request, await fetch(request));
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    throw error;
  }
};

const cacheFirst = async (request) => {
  const cached = await caches.match(request);
  if (cached) return cached;
  return cacheResponse(request, await fetch(request));
};

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request).catch(async () => {
      const cached = await caches.match(request);
      return cached || caches.match(localeFallback(url.pathname));
    }));
    return;
  }

  const isMutableAsset = url.pathname.endsWith(".css") || url.pathname.endsWith(".js");
  event.respondWith(isMutableAsset ? networkFirst(request) : cacheFirst(request));
});
