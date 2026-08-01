"use client"

import { useEffect } from "react"

function isNativeShell(): boolean {
  if (typeof window === "undefined") return false
  const w = window as Window & { __TAURI_INTERNALS__?: unknown }
  return w.__TAURI_INTERNALS__ !== undefined
}

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    // Tauri Android/iOS already bundles assets — a SW can interfere with
    // tauri.localhost / devUrl loads and contribute to blank WebViews.
    if (isNativeShell()) {
      if ("serviceWorker" in navigator) {
        void navigator.serviceWorker.getRegistrations().then((regs) => {
          regs.forEach((reg) => void reg.unregister())
        })
      }
      return
    }

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
