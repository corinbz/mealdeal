// Keeps the basket page usable in a shop with no signal (#17).
//
// The page and its catalogue are fetched network first, so an online visit
// always gets this morning's prices, but with a short timeout: a shop's
// reception is often one bar that never answers, which is worse than none.
// When the network fails, the copy from the last visit is served, and the
// page says it is offline next to the date its prices are from. The list
// itself lives in localStorage and never needed the network.
//
// Only registered when the page is served over HTTP(S); opened from disk it
// works as before, without this.

const CACHE = "mealdeal-v1";
const NETWORK_TIMEOUT_MS = 3000;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(["./", "catalogue.js"])));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  // Fonts never change at a given URL, so the cached copy is always right.
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    event.respondWith(caches.match(request).then((hit) => hit ?? fetchAndKeep(request)));
    return;
  }
  if (url.origin === self.location.origin) event.respondWith(networkFirst(request));
});

async function fetchAndKeep(request) {
  const response = await fetch(request);
  if (response.ok || response.type === "opaque") {
    const copy = response.clone();
    caches.open(CACHE).then((cache) => cache.put(request, copy));
  }
  return response;
}

async function networkFirst(request) {
  const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), NETWORK_TIMEOUT_MS));
  try {
    return await Promise.race([fetchAndKeep(request), timeout]);
  } catch {
    const hit = await caches.match(request, { ignoreSearch: true });
    if (hit) return hit;
    // "/" and "/index.html" are the same page.
    if (request.mode === "navigate") return (await caches.match("./")) ?? Response.error();
    return Response.error();
  }
}
