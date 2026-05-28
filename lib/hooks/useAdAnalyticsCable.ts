"use client"

import { useEffect, useRef } from "react"
import { useAppDispatch } from "@/lib/store/hooks"
import { applyRealtimeUpdate } from "@/lib/store/slices/adsSlice"
import { getAuthToken } from "@/lib/storage"

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000").replace(/\/$/, "")

function cableUrl() {
  return `${API_URL.replace(/^http/, "ws")}/cable`
}

export function useAdAnalyticsCable(businessId: string | null, enabled = true) {
  const dispatch = useAppDispatch()
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    if (!enabled || !businessId || typeof window === "undefined") return

    const token = getAuthToken()
    if (!token) return

    const ws = new WebSocket(`${cableUrl()}?token=${encodeURIComponent(token)}`)
    wsRef.current = ws

    const identifier = JSON.stringify({
      channel: "AdAnalyticsChannel",
      business_id: businessId,
    })

    ws.onopen = () => {
      ws.send(JSON.stringify({ command: "subscribe", identifier }))
    }

    ws.onmessage = (ev) => {
      try {
        const frame = JSON.parse(ev.data as string)
        if (frame.type !== "message" || !frame.message) return
        const data = frame.message
        if (data.event === "stats_updated" && data.campaign_id) {
          dispatch(
            applyRealtimeUpdate({
              campaignId: data.campaign_id,
              impressions: data.impressions,
              clicks: data.clicks,
              spend: data.spend,
              roas: data.roas,
            })
          )
        }
      } catch {
        /* ignore */
      }
    }

    return () => {
      ws.close()
      wsRef.current = null
    }
  }, [businessId, dispatch, enabled])
}
