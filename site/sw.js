// Retires the old app's service worker. Until the move to app.choochootraining.com this address served the app, and its worker is still installed on
// families' phones and browsers, answering from cache. Browsers re-fetch /sw.js, find this file instead, and run it:
// delete every cache, unregister, then reload the open windows so they get the live site (or the redirect to the app).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
    await self.registration.unregister();
    const windows = await self.clients.matchAll({ type: "window" });
    windows.forEach((c) => c.navigate(c.url));
  })());
});
// No fetch handler: until it unregisters, every request goes straight to the network.
