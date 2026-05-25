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

  if (!resolved) {
    return (
      <div
        className={cn("bg-muted animate-pulse", placeholderClassName || className)}
        aria-hidden
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={resolved}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
    />
  );
}
