"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { getAuthToken } from "@/lib/storage"
import {
  fetchAndCacheBusinessLogo,
  getCachedBusinessLogo,
  subscribeBusinessLogoCache,
} from "@/lib/business-logo-cache"

const FAVICON_SRC = "/favicon.png"

type SidebarBrandLogoProps = {
  businessId?: string | null
  size?: number
  className?: string
}

function logoSrcFromCache(businessId?: string | null): string | null {
  const cached = getCachedBusinessLogo(businessId)
  return cached?.blobUrl || cached?.url || null
}

export function SidebarBrandLogo({
  businessId,
  size = 32,
  className = "rounded-lg object-contain shrink-0",
}: SidebarBrandLogoProps) {
  const [logoSrc, setLogoSrc] = useState<string | null>(() => logoSrcFromCache(businessId))
  const [useFallback, setUseFallback] = useState(false)

  useEffect(() => {
    return subscribeBusinessLogoCache(() => {
      const next = logoSrcFromCache(businessId)
      setLogoSrc(next)
      if (next) setUseFallback(false)
    })
  }, [businessId])

  useEffect(() => {
    if (!businessId) {
      setLogoSrc(null)
      setUseFallback(false)
      return
    }

    const existing = getCachedBusinessLogo(businessId)
    if (existing) {
      setLogoSrc(existing.blobUrl || existing.url)
      setUseFallback(false)
    }

    let cancelled = false
    const token = getAuthToken()
    const apiUrl = process.env.NEXT_PUBLIC_API_URL
    if (!token || !apiUrl) return

    ;(async () => {
      const url = await fetchAndCacheBusinessLogo({ businessId, token, apiUrl })
      if (cancelled) return
      const entry = getCachedBusinessLogo(businessId)
      if (entry) {
        setLogoSrc(entry.blobUrl || entry.url)
        setUseFallback(false)
      } else if (!url && !existing) {
        setLogoSrc(null)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [businessId])

  const showBusinessLogo = Boolean(logoSrc) && !useFallback
  const src = showBusinessLogo ? logoSrc! : FAVICON_SRC

  return (
    <Image
      src={src}
      alt={showBusinessLogo ? "Business logo" : "Shettar"}
      width={size}
      height={size}
      className={className}
      onError={() => setUseFallback(true)}
      unoptimized={showBusinessLogo}
    />
  )
}
