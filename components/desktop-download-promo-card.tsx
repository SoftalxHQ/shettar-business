"use client"

import { Monitor, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { isTauri } from "@/lib/tauri"

const DISMISS_KEY = "shettar-desktop-promo-dismissed"

type DesktopDownloadPromoCardProps = {
  dismissed: boolean
  onDismiss: () => void
  onDownload: () => void
}

export function isDesktopPromoDismissed(): boolean {
  if (typeof window === "undefined") return false
  return sessionStorage.getItem(DISMISS_KEY) === "1"
}

export function dismissDesktopPromo(): void {
  if (typeof window === "undefined") return
  sessionStorage.setItem(DISMISS_KEY, "1")
}

/** Fixed top-right card encouraging browser users to install the desktop app. */
export function DesktopDownloadPromoCard({
  dismissed,
  onDismiss,
  onDownload,
}: DesktopDownloadPromoCardProps) {
  if (isTauri()) return null
  if (dismissed) return null

  return (
    <div
      className="fixed top-4 right-4 z-[60] w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-3.5 text-sm text-slate-900 shadow-[0_8px_30px_rgba(15,23,42,0.12)]"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
            <Monitor className="h-3.5 w-3.5" />
          </span>
          <p className="font-semibold leading-tight">Get Shettar Business for desktop</p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded-md p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label="Dismiss desktop download promo"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <p className="mt-2 text-xs leading-relaxed text-slate-500">
        Run the full desktop app for a faster, more reliable front-desk experience on your computer.
      </p>

      <div className="mt-3 flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 rounded-lg px-2.5 text-slate-600"
          onClick={onDismiss}
        >
          Later
        </Button>
        <Button
          type="button"
          size="sm"
          className="h-8 rounded-lg bg-indigo-600 hover:bg-indigo-700"
          onClick={onDownload}
        >
          Download
        </Button>
      </div>
    </div>
  )
}
