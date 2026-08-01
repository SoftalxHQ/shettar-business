"use client"

import { useEffect } from "react"

function isTauriShell(): boolean {
  if (typeof window === "undefined") return false
  const w = window as Window & {
    __TAURI_INTERNALS__?: unknown
    __TAURI__?: unknown
  }
  return w.__TAURI_INTERNALS__ !== undefined || w.__TAURI__ !== undefined
}

/** Mobile OS only — never pad desktop Tauri / browser. */
function isMobileOs(): boolean {
  if (typeof navigator === "undefined") return false
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "")
}

/**
 * Adds `.native-edge` after hydrate on Android/iOS only.
 * Insets come from MainActivity `<style id="shettar-safe-area">` (not html attrs).
 */
export function NativeSafeArea() {
  useEffect(() => {
    try {
      if (isTauriShell() && isMobileOs()) {
        document.documentElement.classList.add("native-edge")
      }
    } catch {
      /* non-fatal */
    }
  }, [])

  return null
}
