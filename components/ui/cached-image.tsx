"use client"

/**
 * CachedImage
 *
 * Wraps next/image (unoptimized) with a Cache API layer that works in both
 * the Tauri WebView and regular browsers.
 *
 * Strategy:
 *  1. On first load, fetch the image through the Cache API and store the
 *     response under a versioned cache name.
 *  2. On subsequent renders the browser/WebView returns the blob from the
 *     local cache — no network round-trip.
 *  3. Cache entries expire after `maxAgeSeconds` (default 7 days).
 *     Stale entries are purged lazily on next load.
 *
 * Usage:
 *   <CachedImage src={imageUrl} alt="Room photo" width={400} height={300} />
 *   <CachedImage src={logoUrl} alt="Logo" fill className="object-cover" />
 */

import Image, { type ImageProps } from "next/image"
import { useEffect, useState } from "react"

const CACHE_NAME = "shettar-images-v1"
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000   // 7 days

interface CachedImageProps extends Omit<ImageProps, "src"> {
  src: string | null | undefined
  fallback?: string
}

function isCacheSupported() {
  return typeof window !== "undefined" && "caches" in window
}

async function loadCachedSrc(src: string): Promise<string> {
  if (!isCacheSupported() || !src) return src

  try {
    const cache = await caches.open(CACHE_NAME)
    const cached = await cache.match(src)

    if (cached) {
      // Check freshness via a custom header we inject on store
      const cachedAt = cached.headers.get("x-cached-at")
      if (cachedAt) {
        const age = Date.now() - Number(cachedAt)
        if (age < MAX_AGE_MS) {
          // Still fresh — return object URL from cached blob
          const blob = await cached.blob()
          return URL.createObjectURL(blob)
        }
      }
      // Stale — fall through to re-fetch
      await cache.delete(src)
    }

    // Fetch and store
    const res = await fetch(src, { mode: "cors", credentials: "omit" })
    if (!res.ok) return src

    // Clone before reading body — cache stores the raw response
    const resForCache = res.clone()
    const blob = await res.blob()

    // Build a synthetic Response with our freshness header
    const headersInit: Record<string, string> = { "x-cached-at": String(Date.now()) }
    res.headers.forEach((val, key) => { headersInit[key] = val })
    const syntheticResponse = new Response(await resForCache.blob(), {
      status: res.status,
      headers: headersInit,
    })
    await cache.put(src, syntheticResponse)

    return URL.createObjectURL(blob)
  } catch {
    // Never break rendering — fall back to original URL
    return src
  }
}

export function CachedImage({ src, fallback, alt, ...props }: CachedImageProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [errored, setErrored] = useState(false)

  useEffect(() => {
    if (!src) return
    let revoked = false
    let objectUrl: string | null = null

    loadCachedSrc(src).then((url) => {
      if (revoked) return
      // Only use blob URL if it's actually a blob (cache hit)
      if (url.startsWith("blob:")) {
        objectUrl = url
        setBlobUrl(url)
      }
      // Otherwise the original URL is returned and img uses that directly
    })

    return () => {
      revoked = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [src])

  const effectiveSrc = errored
    ? (fallback || "/placeholder.png")
    : (blobUrl || src || fallback || "/placeholder.png")

  return (
    <Image
      {...props}
      src={effectiveSrc}
      alt={alt}
      unoptimized
      onError={() => setErrored(true)}
    />
  )
}

/**
 * Manually purge the entire image cache (call on logout or settings reset).
 */
export async function clearImageCache() {
  if (isCacheSupported()) {
    await caches.delete(CACHE_NAME)
  }
}
