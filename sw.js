const CACHE_NAME = 'ntd-v3';
/* Webフォント(Google Fonts)は別に保存して、アプリを更新しても消さない(オフラインでも同じフォントで表示するため) */
const FONT_CACHE = 'ntd-fonts';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k.startsWith('ntd-') && k !== CACHE_NAME && k !== FONT_CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  /* フォントのファイル(fonts.gstatic.com)は中身が変わらないので、保存した物を先に使う */
  if (url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.open(FONT_CACHE).then((cache) =>
        cache.match(event.request).then((hit) => hit || fetch(event.request).then((res) => {
          if (res && res.status === 200) cache.put(event.request, res.clone());
          return res;
        }))
      )
    );
    return;
  }
  /* フォントのCSS(fonts.googleapis.com): ネットにつながる時は新しい物、つながらない時は保存した物 */
  if (url.hostname === 'fonts.googleapis.com') {
    event.respondWith(
      caches.open(FONT_CACHE).then((cache) =>
        fetch(event.request).then((res) => {
          if (res && res.status === 200) cache.put(event.request, res.clone());
          return res;
        }).catch(() => cache.match(event.request).then((hit) => hit || Response.error()))
      )
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((res) => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return res;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
