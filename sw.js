/* =====================================================================
   SERVICE WORKER — chơi offline (PWA)
   - App shell: cache-first (HTML/CSS/JS/icon/manifest)
   - PokéAPI:  stale-while-revalidate (dùng cache, cập nhật nền)
   - Ảnh GitHub: cache-first (ảnh đã xem -> lưu lại để xem offline)
   ===================================================================== */
const CACHE = "poke-quiz-v25";

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/style.css",
  "./js/config.js",
  "./js/dom.js",
  "./js/state.js",
  "./js/audio.js",
  "./js/api.js",
  "./js/effects.js",
  "./js/game.js",
  "./js/puzzle.js",
  "./js/battle.js",
  "./js/pet.js",
  "./js/photo.js",
  "./js/main.js",
  "./img/main-bg.jpg",
  "./img/map-bg.jpg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-180.png"
];

/* Cài đặt: nạp sẵn app shell */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

/* Kích hoạt: dọn cache phiên bản cũ */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

/* Chiến lược cache-first: trả cache nếu có, không thì tải mạng rồi lưu lại */
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const res = await fetch(request);
    if (res && res.status === 200) {
      const cache = await caches.open(CACHE);
      cache.put(request, res.clone());
    }
    return res;
  } catch (e) {
    return cached || Response.error();
  }
}

/* Network-first: ưu tiên bản mới trên mạng; offline mới dùng cache.
   Dùng cho app shell (HTML/CSS/JS) để tránh kẹt phiên bản cũ trong cache. */
async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(request);
    if (res && res.status === 200) cache.put(request, res.clone());
    return res;
  } catch (e) {
    const cached = await cache.match(request);
    return cached || Response.error();
  }
}

/* Stale-while-revalidate: trả cache ngay, đồng thời cập nhật nền */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  const network = fetch(request).then((res) => {
    if (res && res.status === 200) cache.put(request, res.clone());
    return res;
  }).catch(() => cached);
  return cached || network;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Ảnh official-artwork trên GitHub -> cache-first (ảnh đã xem dùng offline)
  if (url.hostname.includes("githubusercontent.com")) {
    event.respondWith(cacheFirst(req));
    return;
  }
  // Dữ liệu PokéAPI -> stale-while-revalidate
  if (url.hostname.includes("pokeapi.co")) {
    event.respondWith(staleWhileRevalidate(req));
    return;
  }
  // App shell cùng origin (HTML/CSS/JS) -> network-first (luôn lấy bản mới khi online)
  if (url.origin === self.location.origin) {
    event.respondWith(networkFirst(req));
    return;
  }
});
