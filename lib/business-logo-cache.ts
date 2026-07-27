/** In-memory session cache for business logos (keyed by businessId). */

export type CachedBusinessLogo = {
  url: string
  blobUrl?: string
}

const byBusinessId = new Map<string, CachedBusinessLogo>()
const blobByUrl = new Map<string, string>()
const inflightBlob = new Map<string, Promise<string>>()
const inflightBusiness = new Map<string, Promise<string | null>>()
const listeners = new Set<() => void>()

function notifyLogoCacheListeners() {
  listeners.forEach((listener) => listener())
}

/** Subscribe to cache updates (logo upload/remove). Returns unsubscribe. */
export function subscribeBusinessLogoCache(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getCachedBusinessLogo(businessId: string | null | undefined): CachedBusinessLogo | null {
  if (!businessId) return null
  return byBusinessId.get(businessId) ?? null
}

export function setCachedBusinessLogo(businessId: string, url: string, blobUrl?: string): void {
  const prev = byBusinessId.get(businessId)
  if (prev && prev.url !== url && prev.blobUrl) {
    URL.revokeObjectURL(prev.blobUrl)
    blobByUrl.delete(prev.url)
  }
  const nextBlob = blobUrl ?? (url === prev?.url ? prev?.blobUrl : undefined) ?? blobByUrl.get(url)
  byBusinessId.set(businessId, { url, blobUrl: nextBlob })
  if (nextBlob) blobByUrl.set(url, nextBlob)
  notifyLogoCacheListeners()
}

export function clearBusinessLogoCache(businessId?: string | null): void {
  if (businessId) {
    const entry = byBusinessId.get(businessId)
    if (entry?.blobUrl) {
      URL.revokeObjectURL(entry.blobUrl)
      blobByUrl.delete(entry.url)
    }
    byBusinessId.delete(businessId)
    inflightBusiness.delete(businessId)
    notifyLogoCacheListeners()
    return
  }

  for (const entry of byBusinessId.values()) {
    if (entry.blobUrl) URL.revokeObjectURL(entry.blobUrl)
  }
  byBusinessId.clear()
  blobByUrl.clear()
  inflightBlob.clear()
  inflightBusiness.clear()
  notifyLogoCacheListeners()
}

/** Fetch image bytes once and return a stable blob: URL for this signed URL. */
export async function resolveBusinessLogoBlob(url: string): Promise<string> {
  const existing = blobByUrl.get(url)
  if (existing) return existing

  const pending = inflightBlob.get(url)
  if (pending) return pending

  const promise = (async () => {
    try {
      const res = await fetch(url, { mode: "cors", credentials: "omit", cache: "force-cache" })
      if (!res.ok) return url
      const blob = await res.blob()
      const objectUrl = URL.createObjectURL(blob)
      blobByUrl.set(url, objectUrl)
      return objectUrl
    } catch {
      return url
    } finally {
      inflightBlob.delete(url)
    }
  })()

  inflightBlob.set(url, promise)
  return promise
}

type FetchLogoOptions = {
  businessId: string
  token: string
  apiUrl: string
}

/** Fetch logo_url for a business; dedupes concurrent requests. Updates the session cache. */
export async function fetchAndCacheBusinessLogo({
  businessId,
  token,
  apiUrl,
}: FetchLogoOptions): Promise<string | null> {
  const pending = inflightBusiness.get(businessId)
  if (pending) return pending

  const promise = (async () => {
    try {
      const res = await fetch(`${apiUrl}/api/v1/user_businesses/${businessId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-Business-Id": businessId,
        },
      })
      if (!res.ok) return getCachedBusinessLogo(businessId)?.url ?? null
      const data = await res.json()
      const url = (data.logo_url || data.business?.logo_url) as string | undefined
      if (!url) {
        clearBusinessLogoCache(businessId)
        return null
      }

      const existing = getCachedBusinessLogo(businessId)
      // Keep showing an existing blob while warming a new one for the latest signed URL.
      if (existing?.blobUrl) {
        const blobUrl = await resolveBusinessLogoBlob(url)
        if (blobUrl.startsWith("blob:")) {
          setCachedBusinessLogo(businessId, url, blobUrl)
        }
        return url
      }

      setCachedBusinessLogo(businessId, url)
      const blobUrl = await resolveBusinessLogoBlob(url)
      if (blobUrl.startsWith("blob:")) {
        setCachedBusinessLogo(businessId, url, blobUrl)
      }
      return url
    } catch {
      return getCachedBusinessLogo(businessId)?.url ?? null
    } finally {
      inflightBusiness.delete(businessId)
    }
  })()

  inflightBusiness.set(businessId, promise)
  return promise
}
