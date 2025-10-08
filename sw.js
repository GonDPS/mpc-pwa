// Service Worker - My Personal Counter v8
const CACHE = 'mpc-cache-v8';
const ASSETS = [
  './',
  './index.html',
  './style.css?v=8',
  './app.js?v=8',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// Instalar y cachear recursos base
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activar y eliminar versiones antiguas del caché
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Estrategia: Cache First con fallback a red
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(res => res || fetch(event.request))
  );
});
