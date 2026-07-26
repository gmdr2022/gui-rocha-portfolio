const CACHE_NAME = "gui-rocha-v6";
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

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)));
      }
      return response;
    }).catch(async () => {
      const cached = await caches.match(request);
      return cached || caches.match(localeFallback(url.pathname));
    }));
    return;
  }

  event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => {
    if (response.ok) {
      const copy = response.clone();
      event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)));
    }
    return response;
  })));
});
