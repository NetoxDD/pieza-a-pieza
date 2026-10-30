const CACHE = "pieza-a-pieza-v1";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function guardar(req, res) {
  if (res.ok) {
    const copia = res.clone();
    caches.open(CACHE).then((c) => c.put(req, copia));
  }
  return res;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // no tocar Supabase ni otros sitios

  // Páginas: primero la red (siempre la versión nueva) y, si no hay internet, la guardada
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => guardar(req, res))
        .catch(() => caches.match(req).then((hit) => hit || caches.match(self.registration.scope)))
    );
    return;
  }

  // Archivos estáticos: primero lo guardado
  if (url.pathname.includes("/_next/static/") || /\.(png|ico|svg|webp|woff2?)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => guardar(req, res)))
    );
  }
});