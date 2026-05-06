// MediPlex Service Worker v3 — Offline + Push + Supabase cache
const CACHE_NAME  = 'mediplex-v3';
const DATA_CACHE  = 'mediplex-data-v1';

const PRECACHE = [
  '/',
  '/dashboard',
  '/login',
  '/manifest.json',
  '/icons/icon.svg',
];

let supabaseOrigin = null; // set via postMessage from client

// ── Install ────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE).catch(() => {}))
  );
  self.skipWaiting();
});

// ── Activate ───────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME && k !== DATA_CACHE)
          .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── Config message from client (passes Supabase URL) ──────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'CONFIG' && event.data.supabaseUrl) {
    try {
      supabaseOrigin = new URL(event.data.supabaseUrl).origin;
    } catch {}
  }
  if (event.data?.type === 'NAVIGATE' && event.data.url) {
    self.clients.matchAll({ type: 'window' }).then(clients => {
      clients.forEach(c => c.navigate(event.data.url));
    });
  }
});

// ── Fetch ──────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // ── Supabase REST API — stale-while-revalidate ─────────────────────────
  if (supabaseOrigin && url.origin === supabaseOrigin) {
    // Only cache GET requests to /rest/v1/ (not auth, storage, realtime)
    if (url.pathname.startsWith('/rest/v1/')) {
      event.respondWith(
        caches.open(DATA_CACHE).then(async (cache) => {
          const cached = await cache.match(req);
          const fetchPromise = fetch(req).then(res => {
            if (res.ok) cache.put(req, res.clone());
            return res;
          }).catch(() => null);

          // Return cached immediately if available (stale-while-revalidate)
          // Otherwise wait for network
          return cached || fetchPromise || new Response('{}', { headers: { 'Content-Type': 'application/json' } });
        })
      );
      return;
    }
    return; // Don't intercept auth/storage/realtime
  }

  // Skip other origins
  if (url.origin !== location.origin) return;

  // Skip Next.js internals
  if (url.pathname.startsWith('/_next/')) return;

  // Skip API routes (except let them fail naturally offline — client uses IndexedDB fallback)
  if (url.pathname.startsWith('/api/')) return;

  // ── Static assets — cache-first ────────────────────────────────────────
  if (url.pathname.match(/\.(svg|png|jpg|jpeg|gif|ico|woff2?|css|js)$/)) {
    event.respondWith(
      caches.match(req).then(cached => {
        if (cached) return cached;
        return fetch(req).then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(req, clone));
          }
          return res;
        });
      })
    );
    return;
  }

  // ── Pages — network-first, cache fallback ─────────────────────────────
  event.respondWith(
    fetch(req)
      .then(res => {
        if (res.ok && res.status < 400) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, clone));
        }
        return res;
      })
      .catch(() =>
        caches.match(req)
          .then(cached => cached || caches.match('/dashboard'))
      )
  );
});

// ── Push Notifications ─────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data?.json() || {}; } catch {}

  const {
    title = 'MediPlex',
    body  = 'You have a new notification',
    url   = '/dashboard',
    tag   = 'mediplex-notif',
    icon  = '/icons/icon.svg',
  } = data;

  event.waitUntil(
    self.registration.showNotification(title, {
      body, icon, tag, renotify: true,
      data: { url },
      vibrate: [200, 100, 200],
      actions: [
        { action: 'open',    title: 'Open' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
    })
  );
});

// ── Notification click ─────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  const targetUrl = event.notification.data?.url || '/dashboard';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      return clients.openWindow(targetUrl);
    })
  );
});

// ── Background sync ────────────────────────────────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-appointments') {
    event.waitUntil(fetch('/api/appointments/sync').catch(() => {}));
  }
});
