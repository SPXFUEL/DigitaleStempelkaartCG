// Coffee Garden service worker
// v4 — Network-first voor HTML + push-handler + notificationclick-handler.

const CACHE_VERSION = "cg-v4";
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
          /* niet kritiek */
        })
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== ASSET_CACHE).map((k) => caches.delete(k))
      );
      await self.clients.claim();
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

  if (
    request.mode === "navigate" ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/_next/")
  ) {
    event.respondWith(fetch(request));
    return;
  }

  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((res) => {
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

// ============================================================
// Push notifications
// ============================================================

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: "Coffee Garden", body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "Coffee Garden";
  const options = {
    body: payload.body || "",
    icon: payload.icon || "/icons/logo-192.png",
    badge: "/icons/logo-192.png",
    tag: payload.tag,
    renotify: !!payload.tag,
    data: { url: payload.url || "/profiel" },
    vibrate: [80, 40, 80],
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/profiel";

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      // Heropen bestaande tab indien mogelijk
      for (const c of allClients) {
        try {
          const url = new URL(c.url);
          if (url.origin === self.location.origin) {
            await c.focus();
            // Navigeer naar de doel-url als 'ie er nog niet is
            if (!c.url.endsWith(targetUrl)) {
              if ("navigate" in c) await c.navigate(targetUrl);
            }
            return;
          }
        } catch {
          /* skip */
        }
      }
      // Anders nieuw venster openen
      await self.clients.openWindow(targetUrl);
    })()
  );
});
