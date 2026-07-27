self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames
        .filter((name) => name.startsWith("gui-rocha-"))
        .map((name) => caches.delete(name)),
    );

    await self.registration.unregister();
    const windowClients = await self.clients.matchAll({ type: "window" });
    await Promise.all(windowClients.map((client) => client.navigate(client.url)));
  })());
});
