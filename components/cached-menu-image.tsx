"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { getCachedMenuImageUrl, resolveMenuImageUrl } from "@/lib/menu-image-cache";
import { ImageIcon } from "lucide-react";

type Props = {
  src?: string | null;
  alt?: string;
  className?: string;
  placeholderClassName?: string;
  showPlaceholderIcon?: boolean;
};

function ShettarMenuImageSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("relative overflow-hidden bg-muted shettar-menu-shimmer", className)}
      aria-hidden
    >
      <span className="absolute inset-0 flex items-center justify-center text-lg font-black tracking-tight text-indigo-600/20 dark:text-white/15 select-none pointer-events-none animate-pulse">
        Shettar
      </span>
    </div>
  );
}

export function CachedMenuImage({
  src,
  alt = "",
  className,
  placeholderClassName,
  showPlaceholderIcon = false,
}: Props) {
  const [resolved, setResolved] = useState<string | null>(() =>
    src ? getCachedMenuImageUrl(src) : null
  );
  const [loadedResolved, setLoadedResolved] = useState<string | null>(null);

  useEffect(() => {
    if (!src) {
      setResolved(null);
      return;
    }
    const cached = getCachedMenuImageUrl(src);
    if (cached) {
      setResolved(cached);
      return;
    }
    let cancelled = false;
    void resolveMenuImageUrl(src).then((url) => {
      if (!cancelled) setResolved(url);
    });
    return () => {
      cancelled = true;
    };
  }, [src]);

  if (!src) {
    return (
      <div
        className={cn(
          "bg-muted flex items-center justify-center text-xs text-muted-foreground",
          placeholderClassName || className
        )}
      >
        {showPlaceholderIcon ? <ImageIcon className="w-5 h-5" /> : "No image"}
      </div>
    );
  }

  const frameClass = cn("relative overflow-hidden", placeholderClassName || className);
  const imageLoaded = loadedResolved === resolved;
  const showSkeleton = !resolved || !imageLoaded;

  return (
    <div className={frameClass}>
      {showSkeleton && <ShettarMenuImageSkeleton className="absolute inset-0 z-[1]" />}
      {resolved ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={resolved}
          alt={alt}
          className={cn(
            className,
            "relative z-[2] transition-opacity duration-300",
            imageLoaded ? "opacity-100" : "opacity-0"
          )}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoadedResolved(resolved)}
        />
      ) : null}
    </div>
  );
}
