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

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ""))
    reader.onerror = () => reject(reader.error ?? new Error("Could not read logo"))
    reader.readAsDataURL(blob)
  })
}

/**
 * Turn a remote logo into an inlined data URL that html2canvas can paint.
 * Browser fetch is CORS-restricted for S3; the desktop app falls back to a
 * native download that is not.
 */
export async function resolveReceiptLogoDataUrl(url: string): Promise<string | null> {
  const trimmed = url.trim()
  if (!trimmed) return null
  if (trimmed.startsWith("data:")) return boostLogoContrast(trimmed)

  const fromBlobUrl = async (blobUrl: string): Promise<string | null> => {
    try {
      const res = await fetch(blobUrl)
      if (!res.ok) return null
      const blob = await res.blob()
      if (!blob.size) return null
      return boostLogoContrast(await blobToDataUrl(blob))
    } catch {
      return null
    }
  }

  const cached = blobByUrl.get(trimmed)
  if (cached) {
    const fromCache = await fromBlobUrl(cached)
    if (fromCache) return fromCache
  }

  if (trimmed.startsWith("blob:")) {
    const fromBlob = await fromBlobUrl(trimmed)
    if (fromBlob) return fromBlob
  }

  try {
    const { isTauri } = await import("@/lib/tauri")
    if (isTauri()) {
      const { invoke } = await import("@tauri-apps/api/core")
      const dataUrl = await invoke<string>("fetch_url_data_url", { url: trimmed })
      if (dataUrl?.startsWith("data:")) return boostLogoContrast(dataUrl)
    }
  } catch {
    // fall through to browser fetch
  }

  try {
    const res = await fetch(trimmed, { mode: "cors", credentials: "omit", cache: "force-cache" })
    if (!res.ok) return null
    const blob = await res.blob()
    if (!blob.size) return null
    return boostLogoContrast(await blobToDataUrl(blob))
  } catch {
    return null
  }
}

/** Flatten transparency and darken the mark so it survives 1-bit thermal dither. */
function boostLogoContrast(dataUrl: string): Promise<string> {
  if (typeof Image === "undefined" || typeof document === "undefined") {
    return Promise.resolve(dataUrl)
  }
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      try {
        const size = 128
        const canvas = document.createElement("canvas")
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext("2d")
        if (!ctx) return resolve(dataUrl)
        ctx.fillStyle = "#ffffff"
        ctx.fillRect(0, 0, size, size)
        const scale = Math.min(size / Math.max(img.width, 1), size / Math.max(img.height, 1))
        const w = img.width * scale
        const h = img.height * scale
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h)
        const image = ctx.getImageData(0, 0, size, size)
        const px = image.data
        for (let i = 0; i < px.length; i += 4) {
          const a = px[i + 3] / 255
          const y = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]
          const luminance = y * a + 255 * (1 - a)
          if (luminance > 242) {
            px[i] = 255
            px[i + 1] = 255
            px[i + 2] = 255
          } else {
            const v = Math.max(0, Math.min(255, luminance * 0.55))
            px[i] = v
            px[i + 1] = v
            px[i + 2] = v
          }
          px[i + 3] = 255
        }
        ctx.putImageData(image, 0, 0)
        resolve(canvas.toDataURL("image/png"))
      } catch {
        resolve(dataUrl)
      }
    }
    img.onerror = () => resolve(dataUrl)
    img.src = dataUrl
  })
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
