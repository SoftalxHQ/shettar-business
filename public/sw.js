// Service worker — image cache for Shettar Business (Tauri + browser)
// Scope: only caches GET requests where the response content-type is image/*

const CACHE_NAME = "shettar-images-v1"
const MAX_ENTRIES = 200          // evict oldest when over limit
const MAX_AGE_SECONDS = 604800   // 7 days

self.addEventListener("install", () => {
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith("shettar-images-") && k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    )
  )
  self.clients.claim()
})

self.addEventListener("fetch", (event) => {
  const { request } = event
  if (request.method !== "GET") return

  const url = new URL(request.url)

  // Only intercept known image origins (API server + S3)
  const isImageRequest =
    /\.(png|jpe?g|gif|webp|svg|avif|ico)(\?.*)?$/i.test(url.pathname) ||
    request.destination === "image"

  if (!isImageRequest) return

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request)

      if (cached) {
        const cachedAt = cached.headers.get("x-sw-cached-at")
        if (cachedAt && Date.now() - Number(cachedAt) < MAX_AGE_SECONDS * 1000) {
          return cached
        }
        // Stale — delete and re-fetch
        await cache.delete(request)
      }

      try {
        const response = await fetch(request)
        if (!response.ok) return response

        const ct = response.headers.get("content-type") || ""
        if (!ct.startsWith("image/")) return response

        // Clone + inject our freshness header
        const headers = new Headers(response.headers)
        headers.set("x-sw-cached-at", String(Date.now()))
        const cloned = new Response(await response.clone().blob(), {
          status: response.status,
          headers,
        })

        await cache.put(request, cloned)
        await trimCache(cache, MAX_ENTRIES)

        return response
      } catch {
        return cached || new Response("Offline", { status: 503 })
      }
    })
  )
})

async function trimCache(cache, maxEntries) {
  const keys = await cache.keys()
  if (keys.length > maxEntries) {
    await cache.delete(keys[0])
    await trimCache(cache, maxEntries)
  }
}
