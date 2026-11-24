const CACHE = "pieza-a-pieza-v2";

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

  // Navegación interna de Next (datos de página): primero la red y, sin internet, lo último visto
  if (url.searchParams.has("_rsc") || url.pathname.endsWith(".txt")) {
    event.respondWith(
      fetch(req)
        .then((res) => guardar(req, res))
        .catch(() => caches.match(req).then((hit) => hit || Response.error()))
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

// ---------- Avisos (push) ----------
self.addEventListener("push", (event) => {
  let d = {};
  try {
    d = event.data ? event.data.json() : {};
  } catch (e) {
    d = { title: "Pieza a pieza", body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(d.title || "Pieza a pieza", {
      body: d.body || "",
      icon: self.registration.scope + "icon-192.png",
      badge: self.registration.scope + "icon-192.png",
      tag: d.tag || undefined,
      data: { url: d.url || self.registration.scope },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || self.registration.scope;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.startsWith(self.registration.scope) && "focus" in c) {
          c.navigate(url).catch(() => {});
          return c.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
