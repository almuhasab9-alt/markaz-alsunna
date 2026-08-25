// Service Worker — مركز السنة
// يخزّن الواجهة والملفات الثابتة للعمل دون إنترنت، ويمرّر طلبات API للشبكة دائماً
const CACHE = 'markaz-alsunna-v2'
const STATIC = ['/', '/static/app.js', '/static/tailwind.css', '/static/logo.png', '/static/icon-192.png', '/static/icon-512.png', '/manifest.webmanifest']
// موارد خارجية (خطوط، Chart.js، الأيقونات) تُخزَّن بعد أول تحميل ناجح ليعمل التطبيق دون إنترنت
const CDN = /^(\w+\.)?(jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com)$/

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(STATIC)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)
  if (e.request.method !== 'GET') return
  if (url.pathname.startsWith('/api/')) {
    // الشبكة أولاً لطلبات API (مزامنة لحظية)
    e.respondWith(fetch(e.request).catch(() => new Response(JSON.stringify({ error: 'offline' }), { status: 503, headers: { 'Content-Type': 'application/json' } })))
    return
  }
  // الكاش أولاً للملفات الثابتة، مع التحديث من الشبكة
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const fetched = fetch(e.request).then((res) => {
        if (res.ok && url.origin === location.origin) {
          const clone = res.clone()
          caches.open(CACHE).then((c) => c.put(e.request, clone))
        } else if (res.type === 'opaque' && CDN.test(url.hostname)) {
          // استجابات CDN (script/link بلا crossorigin) — ok=false لكن صالحة للتخزين والعمل دون إنترنت
          const clone = res.clone()
          caches.open(CACHE).then((c) => c.put(e.request, clone))
        }
        return res
      }).catch(() => cached)
      return cached || fetched
    })
  )
})
