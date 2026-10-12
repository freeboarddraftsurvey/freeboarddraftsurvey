// Freeboard service worker: keeps the app working offline.
// Change VERSION whenever app.html is updated so phones pick up the new version.
const VERSION = "freeboard-1.0.0";
const CORE = ["/app.html", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png", "/maskable-512.png"];
const EXTRA_HOSTS = ["cdnjs.cloudflare.com", "fonts.googleapis.com", "fonts.gstatic.com"]; // Excel reader + fonts, cached after first use

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const ours = url.origin === self.location.origin;
  if (!ours && !EXTRA_HOSTS.includes(url.hostname)) return; // YouTube, mail links etc. go straight to the network
  // stale-while-revalidate: answer from the cache at once (works at sea), refresh it in the background when online
  e.respondWith(caches.open(VERSION).then(async (cache) => {
    const hit = await cache.match(req, { ignoreSearch: ours });
    const net = fetch(req).then((res) => { if (res && (res.ok || res.type === "opaque")) cache.put(req, res.clone()); return res; }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }
    const res = await net;
    if (res) return res;
    if (req.mode === "navigate") return (await cache.match("/app.html")) || Response.error();
    return Response.error();
  }));
});
