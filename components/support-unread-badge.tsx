"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/api-client"

interface SupportStats {
  unread?: number
}

/** Unread support-message count pill for the sidebar Support nav item. */
export function SupportUnreadBadge() {
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    let cancelled = false

    const fetchUnread = async () => {
      try {
        const stats = await api.getBusinessData<SupportStats>("/api/v1/support_tickets/stats")
        if (!cancelled) setUnread(stats.unread ?? 0)
      } catch {
        /* keep the previous count on transient failures */
      }
    }

    fetchUnread()
    window.addEventListener("focus", fetchUnread)
    return () => {
      cancelled = true
      window.removeEventListener("focus", fetchUnread)
    }
  }, [])

  if (unread <= 0) return null

  return (
    <span className="ml-auto min-w-5 h-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
      {unread > 9 ? "9+" : unread}
    </span>
  )
}
