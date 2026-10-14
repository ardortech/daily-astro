// Service worker template. vite.config.js replaces the two placeholders at
// build time and emits the result as /sw.js — don't put it in public/.
const VERSION = '__SW_VERSION__';
const PRECACHE = __SW_PRECACHE__;
const SHELL = `shell-${VERSION}`;
const RUNTIME = 'runtime-fonts';

self.addEventListener('install', event => {
  // cache: 'reload' skips the HTTP cache, so a new worker never precaches stale icons.
  event.waitUntil(caches.open(SHELL).then(c => c.addAll(PRECACHE.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('shell-') && k !== SHELL).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Page, app icons and manifest: network first (cache only as the offline fallback), so a
// deploy or a new icon is never hidden behind an old cache. iOS reads the Home Screen icon
// from these URLs. Hashed /assets/* never change under the same name: cache first.
const FRESH = /^\/(index\.html)?$|^\/[^/]+\.(png|ico|svg|webmanifest)$/;

function networkFirst(req, key = req) {
  return fetch(req)
    .then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(SHELL).then(c => c.put(key, copy)); }
      return res;
    })
    .catch(() => caches.match(key, { cacheName: SHELL }).then(hit => hit || Response.error()));
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (req.mode === 'navigate') {
    event.respondWith(networkFirst(req, '/'));
    return;
  }

  if (url.origin === self.location.origin) {
    if (FRESH.test(url.pathname)) event.respondWith(networkFirst(req));
    else event.respondWith(caches.match(req).then(hit => hit || fetch(req)));
    return;
  }

  // Google Fonts: stale-while-revalidate so the app keeps its look offline.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(caches.open(RUNTIME).then(async c => {
      const hit = await c.match(req);
      const net = fetch(req).then(res => { if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    }));
  }
});

// ---- Push: stub until Phase 4 (VAPID, per-user time + time zone). ----
// iOS revokes the subscription if a push arrives without a visible
// notification, so the stub still shows one.
self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data?.text() }; }
  event.waitUntil(self.registration.showNotification(data.title || '每日吉光', {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    lang: 'zh-TW',
    data: { url: data.url || '/' },
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = event.notification.data?.url || '/';
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    const open = list.find(c => new URL(c.url).pathname === new URL(target, self.location.origin).pathname);
    return open ? open.focus() : self.clients.openWindow(target);
  }));
});
