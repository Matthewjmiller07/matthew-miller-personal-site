// Kama Ze service worker: the app shell and the last price files are kept on the phone, so
// the app opens and compares prices with no signal (supermarket basements are like that).
const VERSION = 'kamaze-v1';
const SHELL = ['/kamaze/', '/kamaze/styles.css', '/kamaze/app.js', '/kamaze/i18n.js', '/kamaze/charts.js', '/kamaze/manifest.webmanifest', '/kamaze/icons/icon.svg', '/kamaze/icons/icon-192.png'];
const DATA_HOST = 'raw.githubusercontent.com';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('kamaze-') && k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

const put = (req, res) => { if (res.ok) caches.open(VERSION).then((c) => c.put(req, res.clone())); return res; };
const networkFirst = (req) => fetch(req).then((res) => put(req, res)).catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || Response.error()));
const cacheFirst = (req) => caches.match(req).then((hit) => hit || fetch(req).then((res) => put(req, res)));
const staleWhileRevalidate = (req) => caches.match(req, { ignoreSearch: true }).then((hit) => {
  const fresh = fetch(req).then((res) => put(req, res)).catch(() => hit);
  return hit || fresh;
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const ours = url.origin === location.origin && url.pathname.startsWith('/kamaze/');
  if (url.hostname === DATA_HOST || (ours && url.pathname.startsWith('/kamaze/data/'))) e.respondWith(networkFirst(req));
  else if (ours && url.pathname.startsWith('/kamaze/vendor/')) e.respondWith(cacheFirst(req));
  else if (ours) e.respondWith(req.mode === 'navigate' ? networkFirst(req) : staleWhileRevalidate(req));
});
