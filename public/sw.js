// B'LURU FRESH Service Worker — v7
// Bump the version any time sw.js changes so the browser installs the update.
const CACHE = 'blurufresh-v7'

// ── NO pre-caching on install ─────────────────────────────────────────────────
// Previously we pre-cached HTML pages in the install event using cache.addAll().
// That turned out to be the root cause of silent install failures: if ANY URL in
// the list returns a non-2xx response (e.g. a slow cold-start server, a 500, or
// a network hiccup) the entire SW installation is aborted by the browser.
// The old v3/v4 SW then stays active and continues to serve stale /_next/ bundles.
//
// Fix: skip pre-caching entirely. The install event just calls skipWaiting() so
// the new SW activates immediately. HTML pages are cached dynamically on first
// access via the fetch handler below — this is just as effective for offline
// fallback and cannot block installation.

self.addEventListener('install', (event) => {
  // Nothing to pre-cache — activate immediately.
  event.waitUntil(Promise.resolve())
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// Allow the page to trigger immediate activation of a waiting service worker
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})

self.addEventListener('fetch', (event) => {
  // ── Only handle GET requests ─────────────────────────────────────────────
  if (event.request.method !== 'GET') return

  // ── Skip cross-origin requests entirely (Supabase API, fonts, etc.) ──────
  // If we intercept these and fall back to an empty cache, respondWith(undefined)
  // throws a TypeError that can corrupt the Supabase auth client.
  if (!event.request.url.startsWith(self.location.origin)) return

  // ── Skip Next.js JS/CSS bundles ──────────────────────────────────────────
  // In dev (Turbopack) these change content without changing URL on every
  // recompile, causing the sw to serve stale code. In production they are
  // content-addressed (hash in filename) so the browser's built-in HTTP cache
  // handles immutability — no benefit to double-caching here.
  if (event.request.url.includes('/_next/')) return

  // ── Skip API routes ───────────────────────────────────────────────────────
  if (event.request.url.includes('/api/')) return

  // ── For HTML navigation requests: network-first, fall back to cache ──────
  // This gives basic offline support for the app shell pages.
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache successful HTML responses for offline fallback
        if (response && response.status === 200 && response.type === 'basic') {
          caches.open(CACHE).then(cache => cache.put(event.request, response.clone()))
        }
        return response
      })
      .catch(() =>
        caches.match(event.request).then(cached =>
          cached ?? new Response('Offline — please check your connection.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' },
          })
        )
      )
  )
})

// ── Push Notifications ────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = {
    title: "B'luru Fresh",
    body:  'Your order has been updated.',
    icon:  '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
  }
  try {
    if (event.data) data = { ...data, ...JSON.parse(event.data.text()) }
  } catch {}

  event.waitUntil(
    Promise.all([
      // Show the notification
      self.registration.showNotification(data.title, {
        body:     data.body,
        icon:     data.icon,
        badge:    data.badge,
        vibrate:  [100, 50, 100],
        tag:      'order-update',
        renotify: true,
        data:     { url: data.url ?? '/order' },
      }),
      // Tell any open pages to refresh their order list immediately
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
        list.forEach(c => c.postMessage({ type: 'ORDER_UPDATE' }))
      }),
    ])
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/order'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if (c.url.includes(url) && 'focus' in c) return c.focus()
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})
