// Coffee Garden service worker
// v3 — Network-first voor HTML (pages worden server-rendered en moeten ALTIJD vers).
// Cache alleen statische assets (logo's, manifest). Bij activate worden alle oude
// caches gewist en posten we een 'reload' bericht naar alle open tabs zodat ze de
// nieuwe versie meteen tonen.

const CACHE_VERSION = "cg-v3";
const ASSET_CACHE = `${CACHE_VERSION}-assets`;
const STATIC_ASSETS = [
  "/manifest.webmanifest",
  "/icons/logo-192.png",
  "/icons/logo-512.png",
  "/icons/logo-apple.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(ASSET_CACHE)
      .then((cache) =>
        cache.addAll(STATIC_ASSETS).catch(() => {
          /* sommige assets ontbreken evt. lokaal — niet kritiek */
        })
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Verwijder ALLE oude caches, niet alleen anders genaamde versies.
      // Vooral belangrijk voor cg-shell-v1 die HTML cachede.
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== ASSET_CACHE).map((k) => caches.delete(k))
      );
      await self.clients.claim();
      // Vertel alle open tabs dat ze de pagina moeten herladen, zodat ze
      // de nieuwe SW-strategie meteen gebruiken (i.p.v. te wachten op
      // een volgende navigatie).
      const clients = await self.clients.matchAll({ type: "window" });
      for (const c of clients) {
        c.postMessage({ type: "sw-updated", version: CACHE_VERSION });
      }
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // HTML navigations + alle API/Next-routes: ALTIJD vers van het netwerk,
  // alleen fallback naar cache als we offline zijn (en zelfs dan slechts
  // assets, geen HTML — gebruiker krijgt liever een echte offline-melding
  // dan een stale pagina die op interactie wacht).
  if (
    request.mode === "navigate" ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/_next/")
  ) {
    event.respondWith(fetch(request));
    return;
  }

  // Statische assets: cache-first om snelheid + werking-bij-slechte-wifi.
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((res) => {
          // Cache nieuwe statische assets opportunistisch
          if (
            res.ok &&
            (url.pathname.startsWith("/icons/") ||
              url.pathname.endsWith(".webmanifest"))
          ) {
            const copy = res.clone();
            caches.open(ASSET_CACHE).then((c) => c.put(request, copy));
          }
          return res;
        })
    )
  );
});
