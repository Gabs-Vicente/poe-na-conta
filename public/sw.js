const CACHE_NAME = 'poe-na-conta-pwa-v3'
const SHARE_CACHE_NAME = 'poe-na-conta-share-v1'
const SHARE_TARGET_KEY = './__shared-backup__.json'
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './poe-na-conta.svg',
  './icon-192.png',
  './icon-512.png',
  /*__VITE_PRECACHE_ASSETS__*/
]

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== CACHE_NAME && key !== SHARE_CACHE_NAME).map(key => caches.delete(key))),
    ).then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.method === 'POST' && url.pathname.endsWith('/share-backup')) {
    event.respondWith((async () => {
      try {
        const formData = await request.formData()
        const file = formData.get('backup')
        let jsonText = ''
        if (file && typeof file.text === 'function') {
          jsonText = await file.text()
        } else {
          const textField = formData.get('text')
          if (typeof textField === 'string') jsonText = textField
        }
        if (jsonText) {
          const shareCache = await caches.open(SHARE_CACHE_NAME)
          await shareCache.put(
            SHARE_TARGET_KEY,
            new Response(jsonText, { headers: { 'Content-Type': 'application/json;charset=utf-8' } }),
          )
        }
      } catch {
        // Ignora erro de leitura e redireciona para o app
      }
      return Response.redirect('./?shared-backup=1', 303)
    })())
    return
  }

  if (request.method !== 'GET') return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const clone = response.clone()
          caches.open(CACHE_NAME).then(cache => cache.put('./index.html', clone))
          return response
        })
        .catch(() => caches.match('./index.html').then(res => res || caches.match('./'))),
    )
    return
  }

  event.respondWith(
    caches.match(request).then(cached => {
      const networkFetch = fetch(request)
        .then(response => {
          if (response && response.status === 200 && response.type === 'basic') {
            const clone = response.clone()
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone))
          }
          return response
        })
        .catch(() => cached)
      return cached || networkFetch
    }),
  )
})
