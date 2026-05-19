"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { getAuthToken } from "@/lib/storage"

const FAVICON_SRC = "/shettar-icon.png"

type SidebarBrandLogoProps = {
  businessId?: string | null
  size?: number
  className?: string
}

export function SidebarBrandLogo({
  businessId,
  size = 32,
  className = "rounded-lg object-contain shrink-0",
}: SidebarBrandLogoProps) {
  const [businessLogoUrl, setBusinessLogoUrl] = useState<string | null>(null)
  const [useFallback, setUseFallback] = useState(false)

  useEffect(() => {
    if (!businessId) {
      setBusinessLogoUrl(null)
      setUseFallback(false)
      return
    }

    let cancelled = false
    const token = getAuthToken()
    const apiUrl = process.env.NEXT_PUBLIC_API_URL

    if (!token || !apiUrl) return

    ;(async () => {
      try {
        const res = await fetch(`${apiUrl}/api/v1/user_businesses/${businessId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "X-Business-Id": businessId,
          },
        })
        if (!res.ok || cancelled) return
        const data = await res.json()
        const url = data.logo_url || data.business?.logo_url
        if (!cancelled && url) {
          setBusinessLogoUrl(url)
          setUseFallback(false)
        }
      } catch {
        // keep favicon fallback
      }
    })()

    return () => {
      cancelled = true
    }
  }, [businessId])

  const showBusinessLogo = Boolean(businessLogoUrl) && !useFallback
  const src = showBusinessLogo ? businessLogoUrl! : FAVICON_SRC

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
