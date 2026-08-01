"use client"

import { useEffect } from "react"

function isNativeShell(): boolean {
  if (typeof window === "undefined") return false
  const w = window as Window & {
    __TAURI_INTERNALS__?: unknown
    __TAURI__?: unknown
  }
  return w.__TAURI_INTERNALS__ !== undefined || w.__TAURI__ !== undefined
}

/**
 * Marks the document for native edge-to-edge safe-area padding.
 * Intentionally does NOT import `@/lib/tauri` — that module pulls window /
 * notification / barcode plugins and can break first paint on Android WebView.
 */
export function NativeSafeArea() {
  useEffect(() => {
    try {
      if (isNativeShell()) {
        document.documentElement.classList.add("native-edge")
      }
    } catch {
      /* non-fatal */
    }
  }, [])

  return null
}
