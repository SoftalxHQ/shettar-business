/** In-memory + browser-cache warmup for restaurant menu images. */

const blobCache = new Map<string, string>();
const inflight = new Map<string, Promise<string>>();

export function getCachedMenuImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return blobCache.get(url) ?? null;
}

export async function resolveMenuImageUrl(url: string): Promise<string> {
  const existing = blobCache.get(url);
  if (existing) return existing;

  const pending = inflight.get(url);
  if (pending) return pending;

  const promise = (async () => {
    try {
      const res = await fetch(url, { mode: "cors", cache: "force-cache" });
      if (!res.ok) return url;
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      blobCache.set(url, objectUrl);
      return objectUrl;
    } catch {
      return url;
    } finally {
      inflight.delete(url);
    }
  })();

  inflight.set(url, promise);
  return promise;
}

export function prefetchMenuImages(urls: (string | null | undefined)[]) {
  const unique = [...new Set(urls.filter((u): u is string => !!u))];
  unique.forEach((url) => {
    void resolveMenuImageUrl(url);
  });
}
