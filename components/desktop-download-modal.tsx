"use client"

import { useEffect, useMemo, useState } from "react"
import { Apple, Download, Loader2, Monitor } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  detectOs,
  fetchLatestDesktopRelease,
  otherDesktopDownloads,
  primaryDesktopDownload,
  type LatestDesktopRelease,
} from "@/lib/desktop-download"

type DesktopDownloadModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function PlatformIcon({ platform }: { platform: "windows" | "macos" | "linux" }) {
  if (platform === "macos") return <Apple className="h-4 w-4" />
  if (platform === "linux") return <Monitor className="h-4 w-4" />
  return <Monitor className="h-4 w-4" />
}

export function DesktopDownloadModal({ open, onOpenChange }: DesktopDownloadModalProps) {
  const [release, setRelease] = useState<LatestDesktopRelease | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const os = useMemo(() => detectOs(), [])

  useEffect(() => {
    if (!open) return

    let cancelled = false
    setLoading(true)
    setError(null)

    void fetchLatestDesktopRelease()
      .then((latest) => {
        if (!cancelled) setRelease(latest)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setRelease(null)
          setError(err instanceof Error ? err.message : "Failed to load downloads")
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open])

  const primary = useMemo(() => {
    if (!release) return null
    return primaryDesktopDownload(release.installers, os)
  }, [release, os])

  const otherLinks = useMemo(() => {
    if (!release) return []
    return otherDesktopDownloads(release.installers, primary?.url)
  }, [release, primary])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Download Shettar Business</DialogTitle>
          <DialogDescription>
            Install the desktop app for Windows, macOS, or Linux and manage your property from a
            dedicated workspace.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading installers…
          </div>
        ) : null}

        {!loading && error ? (
          <p className="rounded-xl border border-red-100 bg-red-50 px-3 py-2.5 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {!loading && !error && release ? (
          <div className="space-y-4">
            {release.version ? (
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
                Version {release.version}
              </p>
            ) : null}

            {primary ? (
              <Button asChild className="h-11 w-full rounded-xl bg-indigo-600 hover:bg-indigo-700">
                <a href={primary.url} target="_blank" rel="noopener noreferrer">
                  <PlatformIcon platform={primary.platform} />
                  {primary.label}
                  <Download className="h-4 w-4" />
                </a>
              </Button>
            ) : (
              <p className="text-sm text-slate-500">
                Installer links are not available for this release yet.
              </p>
            )}

            {otherLinks.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Other platforms
                </p>
                <div className="flex flex-wrap gap-2">
                  {otherLinks.map((link) => (
                    <Button
                      key={link.label}
                      asChild
                      variant="outline"
                      size="sm"
                      className="rounded-lg"
                    >
                      <a href={link.url} target="_blank" rel="noopener noreferrer">
                        {link.label}
                      </a>
                    </Button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
