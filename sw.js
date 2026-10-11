// Service worker: la app funciona sin conexión. Cambia VERSION al publicar cambios.
const VERSION = 'nido-v5';
const SHELL = [
  './', 'index.html', 'css/styles.css', 'manifest.webmanifest',
  'js/app.js', 'js/store.js', 'js/util.js', 'js/calc.js', 'js/game.js', 'js/pet.js',
  'js/plans.js', 'js/food.js', 'js/sync.js', 'js/firebase-config.js', 'js/icons.js', 'js/extras.js',
  'fonts/jakarta-latin.woff2', 'fonts/jakarta-latin-ext.woff2',
  'icons/icon-192.png', 'icons/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== 'nido-img' && k !== 'nido-lib').map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  // Ilustraciones de ejercicios y SDK de Firebase: caché primero
  if (url.hostname === 'cdn.jsdelivr.net' || url.hostname === 'www.gstatic.com') {
    const bucket = url.hostname === 'cdn.jsdelivr.net' ? 'nido-img' : 'nido-lib';
    e.respondWith(caches.open(bucket).then(async c => {
      const hit = await c.match(e.request);
      if (hit) return hit;
      const res = await fetch(e.request);
      if (res.ok) c.put(e.request, res.clone());
      return res;
    }));
    return;
  }
  // App: red primero (para recibir actualizaciones), caché si no hay conexión
  if (url.origin === location.origin) {
    e.respondWith(fetch(e.request).then(res => {
      if (res.ok) caches.open(VERSION).then(c => c.put(e.request, res.clone()));
      return res;
    }).catch(() => caches.match(e.request).then(r => r || caches.match('index.html'))));
  }
});
