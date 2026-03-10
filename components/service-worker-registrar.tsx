"use client"

import { useEffect } from "react"

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((reg) => {
          console.log("[SW] registered, scope:", reg.scope)
        })
        .catch((err) => {
          // Non-fatal — app works fine without SW
          console.warn("[SW] registration failed:", err)
        })
    }
  }, [])

  return null
}
