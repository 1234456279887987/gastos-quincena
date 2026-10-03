// Guarda la app en el iPhone para que abra sin internet.
// Si cambias index.html, sube este numero (v2, v3...) para que se actualice.
const CACHE = 'gastos-v1';
const ARCHIVOS = ['./', './index.html', './manifest.json', './icon-180.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARCHIVOS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks =>
    Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

// Primero intenta usar lo guardado; si no esta, va a internet.
self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request, { ignoreSearch: true })
    .then(r => r || fetch(e.request)));
});
