// Minimal app-shell service worker: fast loads + an offline fallback page.
// Sale submissions and all data reads stay network-only — offline queuing of
// transactions is a deliberate V1 non-goal (see project README).
const CACHE_NAME = "aquatrack-shell-v1";
const SHELL_ASSETS = [
  "/offline.html",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return; // never intercept mutations (sale submission, etc.)

  const url = new URL(req.url);
  if (url.pathname.startsWith("/api/")) return; // always live data

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match("/offline.html").then((r) => r ?? Response.error()))
    );
    return;
  }

  if (url.origin === self.location.origin && (url.pathname.startsWith("/_next/static") || url.pathname.startsWith("/icons"))) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        });
      })
    );
  }
});
