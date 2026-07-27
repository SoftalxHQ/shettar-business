/** In-memory blob cache for remote images (menu, room types, etc.).
 * Keys by stable origin+pathname so rotating S3 signed query strings still hit.
 */

const blobCache = new Map<string, string>()
const inflight = new Map<string, Promise<string>>()

export function stableImageCacheKey(url: string): string {
  try {
    const parsed = new URL(url)
    return `${parsed.origin}${parsed.pathname}`
  } catch {
    return url
  }
}

export function getCachedMenuImageUrl(url: string | null | undefined): string | null {
  if (!url) return null
  return blobCache.get(stableImageCacheKey(url)) ?? null
}

export async function resolveMenuImageUrl(url: string): Promise<string> {
  const key = stableImageCacheKey(url)
  const existing = blobCache.get(key)
  if (existing) return existing

  const pending = inflight.get(key)
  if (pending) return pending

  const promise = (async () => {
    try {
      const res = await fetch(url, { mode: "cors", credentials: "omit", cache: "force-cache" })
      if (!res.ok) return url
      const blob = await res.blob()
      const objectUrl = URL.createObjectURL(blob)
      const prev = blobCache.get(key)
      if (prev && prev !== objectUrl) URL.revokeObjectURL(prev)
      blobCache.set(key, objectUrl)
      return objectUrl
    } catch {
      return url
    } finally {
      inflight.delete(key)
    }
  })()

  inflight.set(key, promise)
  return promise
}

export function prefetchMenuImages(urls: (string | null | undefined)[]) {
  const unique = [...new Set(urls.filter((u): u is string => !!u))]
  unique.forEach((url) => {
    void resolveMenuImageUrl(url)
  })
}

/** Alias for room / general remote images. */
export const getCachedRemoteImageUrl = getCachedMenuImageUrl
export const resolveRemoteImageUrl = resolveMenuImageUrl
export const prefetchRemoteImages = prefetchMenuImages

export function clearMenuImageCache(): void {
  for (const objectUrl of blobCache.values()) {
    URL.revokeObjectURL(objectUrl)
  }
  blobCache.clear()
  inflight.clear()
}

export const clearRemoteImageCache = clearMenuImageCache
