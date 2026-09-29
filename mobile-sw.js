const CACHE_NAME = "tiki-mobile-v2";
const scoped = (path) => new URL(path, self.registration.scope).pathname;
const ROOT_PAGE = scoped("");
const MOBILE_PAGE = scoped("mobile.html");
const isolated = (response) => {
  const headers = new Headers(response.headers);
  headers.set("Cross-Origin-Opener-Policy", "same-origin");
  headers.set("Cross-Origin-Embedder-Policy", "require-corp");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
};

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const page = await fetch(MOBILE_PAGE, { cache: "reload" });
    if (!page.ok) throw new Error("No se pudo guardar TIKI móvil sin conexión");
    const html = await page.clone().text();
    await cache.put(MOBILE_PAGE, isolated(page));
    const root = await fetch(ROOT_PAGE, { cache: "reload" });
    if (!root.ok) throw new Error("No se pudo guardar la portada de TIKI móvil");
    await cache.put(ROOT_PAGE, isolated(root));
    const paths = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
      .map((match) => new URL(match[1], self.registration.scope).pathname)
      .filter((path) => path.startsWith(scoped("assets/")) ||
        path === scoped("mobile.webmanifest") || path === scoped("mobile-icon.svg"));
    paths.push(scoped("whisper/worker.js"), scoped("whisper/engine.js"));
    await Promise.all(paths.map(async (path) => {
      const response = await fetch(path, { cache: "reload" });
      if (!response.ok) throw new Error(`No se pudo guardar ${path}`);
      await cache.put(path, response);
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name.startsWith("tiki-mobile-") && name !== CACHE_NAME)
      .map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin ||
    !(url.pathname === ROOT_PAGE || url.pathname === MOBILE_PAGE ||
      url.pathname.startsWith(scoped("assets/")) ||
      url.pathname.startsWith(scoped("whisper/")) ||
      url.pathname === scoped("mobile.webmanifest") || url.pathname === scoped("mobile-icon.svg"))) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      const response = await fetch(event.request);
      if (response.ok) {
        const copy = isolated(response.clone());
        await cache.put(event.request, copy);
      }
      return isolated(response);
    } catch {
      const stored = await cache.match(event.request);
      if (stored) return stored;
      throw new Error("TIKI móvil todavía no está guardado para usar sin conexión");
    }
  })());
});
