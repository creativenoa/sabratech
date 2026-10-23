/* SabraTech service worker — deliberately conservative.
 *
 * The whole point of a service worker is caching, and the classic failure mode
 * is caching too eagerly: visitors get a stale site for days after a deploy and
 * nobody can explain why. So the rules here are narrow:
 *
 *   - Vite build assets (/assets/*) are content-hashed, so their filename
 *     changes whenever the content does. Those are safe to cache forever.
 *   - Everything else (HTML, API calls, Supabase) goes to the network FIRST.
 *     The cache is only ever a fallback for being offline.
 *   - Supabase and /api are never cached at all — stale member data would be
 *     worse than an error message.
 *
 * Bump CACHE_VERSION to force every client to drop its old cache.
 */

const CACHE_VERSION = 'sabratech-v5'
const OFFLINE_URL = '/index.html'

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(c => c.addAll([OFFLINE_URL, '/icon-192.png']))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', event => {
  const { request } = event
  if (request.method !== 'GET') return

  let url
  try { url = new URL(request.url) } catch { return }

  // Never touch other origins (Supabase, Google Fonts, Leaflet tiles, Resend).
  if (url.origin !== self.location.origin) return
  // Never cache our own serverless routes or the auth relay.
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/neon-auth/')) return

  // Immutable hashed build output: cache-first.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then(hit => hit || fetch(request).then(res => {
        if (res.ok) {
          const copy = res.clone()
          caches.open(CACHE_VERSION).then(c => c.put(request, copy))
        }
        return res
      }))
    )
    return
  }

  // Navigations: network-first so a deploy is picked up immediately,
  // falling back to the cached shell only when genuinely offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(res => {
          const copy = res.clone()
          caches.open(CACHE_VERSION).then(c => c.put(OFFLINE_URL, copy))
          return res
        })
        .catch(() => caches.match(OFFLINE_URL).then(hit => hit || Response.error()))
    )
    return
  }

  // Everything else same-origin (icons, svg logos): network-first, cache fallback.
  event.respondWith(
    fetch(request)
      .then(res => {
        if (res.ok) {
          const copy = res.clone()
          caches.open(CACHE_VERSION).then(c => c.put(request, copy))
        }
        return res
      })
      .catch(() => caches.match(request).then(hit => hit || Response.error()))
  )
})

// ---------- Phone alerts (web push) ----------
self.addEventListener('push', event => {
  let data = {}
  try { data = event.data ? event.data.json() : {} } catch { data = { title: event.data && event.data.text() } }
  const title = data.title || 'SabraTech'
  event.waitUntil(self.registration.showNotification(title, {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag,
    data: { url: data.url || '/notifications' },
  }))
})

// Tapping an alert opens (or focuses) the site at the alert's page.
self.addEventListener('notificationclick', event => {
  event.notification.close()
  const target = new URL(event.notification.data?.url || '/notifications', self.location.origin).href
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const w of wins) {
      if (new URL(w.url).origin === self.location.origin) {
        await w.focus()
        if ('navigate' in w) return w.navigate(target)
        return
      }
    }
    return self.clients.openWindow(target)
  })())
})
